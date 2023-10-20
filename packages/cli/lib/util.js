'use strict';

const debug = require('node:util').debuglog('rapid');
const path = require('node:path');
const fs = require('node:fs/promises');
const { existsSync } = require('node:fs');
const os = require('node:os');
const url = require('node:url');
const crypto = require('node:crypto');
const mapWorkspaces = require('@npmcli/map-workspaces');

const parser = require('yargs-parser');
const { NpmFsMode } = require('./constants');
const {
  NotSupportedError,
  FuseDeviceError,
} = require('./error');
const execa = require('execa');
const normalize = require('npm-normalize-package-bin');
const {
  tarBucketsDir,
  baseRapidModeDir,
  nydusdBootstrapFile,
  nydusdMnt,
} = require('./constants');

// node_modules/a -> a
// node_mdoules/@scope/b -> @scope/b
function getPackagePath(dep) {
  if (dep[0].startsWith('node_modules/')) {
    return dep[0].substr(13);
  }
  return dep[0];
}

function getDisplayName(dep, mode = NpmFsMode.NPM) {
  const {
    name,
    version,
  } = dep;

  if (mode === NpmFsMode.NPMINSTALL) {
    return `_${name.replace(/\//g, '_')}@${version}@${name}`;
  }
  return `${name}@${version}`;
}

function wrapSudo(shScript) {
  const username = os.userInfo().username;
  if (username === 'root') {
    return shScript;
  }

  return `sudo ${shScript}`;
}

// 需要手动写入，保证 path 路径符合预期
async function createNydusdConfigFile(path) {
  await fs.writeFile(path, JSON.stringify({
    device: {
      backend: {
        type: 'localfs',
        config: {
          dir: tarBucketsDir,
          readahead: false,
        },
      },
    },
    mode: 'direct',
    digest_validate: false, // skip entry shasum check
    iostats_files: false, // skip profile file generation
  }), 'utf8');
}

// rapid 强依赖 fuse，暂时只在 Linux/MacOS 下开放
async function shouldFuseSupport() {
  if (os.type() === 'Linux') {
    const fuse = '/dev/fuse';
    const sh = wrapSudo(`${process.execPath} -e "fs.closeSync(fs.openSync('${fuse}'))"`);
    console.info(`[rapid] detect /dev/fuse: ${sh}`);

    try {
      await execa.command(sh, {
        stdio: 'ignore',
      });
    } catch (e) {
      debug(e && e.stdio && e.stdio.stderr.toString());
      throw new FuseDeviceError();
    }
  }

  if (os.type() === 'Darwin') {
    try {
      await fs.stat('/usr/local/bin/go-nfsv4');
    } catch (error) {
      throw new NotSupportedError('install fuse-t first.');
    }
  }

  if (os.type() === 'Windows') {
    throw new NotSupportedError('you can use WSL2 to run rapid on Windows, see: https://docs.microsoft.com/en-us/windows/wsl/install');
  }
}

function getPkgNameFromTarballUrl(tarballUrl) {
  const pathname = new url.URL(tarballUrl).pathname.substring(1);
  if (pathname.includes('@')) {
    if (pathname.includes('/-/')) { // @scope/download/-/download-1.0.0.tgz
      return pathname.substring(0, pathname.indexOf('/-/'));
    }
    // @scope/download/download/@scope/download-1.0.0.tgz
    return pathname.substring(0, pathname.lastIndexOf('/download/@'));
  }

  if (pathname.includes('/-/')) { // download/-/download-1.0.0.tgz
    return pathname.substring(0, pathname.indexOf('/-/'));
  }
  // download/download/download-1.0.0.tgz
  return pathname.substring(0, pathname.lastIndexOf('/download/'));
}

function generatePackageId(name, version) {
  return `${name}@${version}`.replace('/', '_');
}

function generateBin({ binName, binPath, pkgPath, uid, gid }) {
  // .bin 一定在包名的同一级
  let binLink = path.join(path.dirname(pkgPath), '.bin');
  const pkgName = getPackageNameFromPackagePath(pkgPath);
  // 带 scope 的包需要找 2 级的 .bin
  if (pkgName.startsWith('@')) {
    binLink = path.join(path.dirname(path.dirname(pkgPath)), '.bin');
  }
  return {
    name: path.join(binLink, binName),
    type: 'symlink',
    size: 0,
    linkName: path.relative(binLink, binPath),
    mode: 0o755,
    uid,
    gid,
    uname: 'admin',
    gname: 'admin',
    offset: 0,
    devMajor: 0,
    devMinor: 0,
    NumLink: 0,
    digest: '',
  };
}

function generateSymbolLink(path, target, uid, gid, isDir) {
  return {
    name: path,
    type: 'symlink',
    size: 0,
    linkName: target,
    mode: isDir ? 0o777 : 0o666,
    uid,
    gid,
    uname: 'admin',
    gname: 'admin',
    offset: 0,
    devMajor: 0,
    devMinor: 0,
    NumLink: 0,
    digest: '',
  };
}

function rootDir(uid, gid) {
  return {
    name: '',
    type: 'dir',
    size: 0,
    mode: 0o755,
    uid,
    gid,
    uname: 'admin',
    gname: 'admin',
    offset: 0,
    devMajor: 0,
    devMinor: 0,
    NumLink: 0,
    digest: '',
  };
}

function getPackageNameFromPackagePath(packagePath) {
  if (!packagePath.includes('node_modules/')) {
    return packagePath;
  }
  const index = packagePath.lastIndexOf('node_modules/');
  return packagePath.substr(index + 'node_modules/'.length);
}

function getAliasPackageNameFromPackagePath(packagePath, packages) {
  if (!packagePath.includes('node_modules/')) {
    return packagePath;
  }

  const pkgInfo = packages[packagePath];
  return pkgInfo.name || getPackageNameFromPackagePath(packagePath);
}

function verifyNpmConstraint(constraints, value) {
  if (!constraints) return true;
  if (!Array.isArray(constraints)) {
    constraints = [ constraints ];
  }
  const positive = constraints.filter(t => !t.startsWith('!'));
  const negative = constraints.filter(t => t.startsWith('!')).map(t => t.substr(1));
  if (positive.length) {
    return positive.includes(value);
  }
  if (negative.length) {
    return !negative.includes(value);
  }
  return true;
}

function isFlattenPackage(pkgPath) {
  return pkgPath.lastIndexOf('node_modules') === 0;
}

function resolveBinMap(pkgJSON) {
  // "bin": './bin/a' -> "bin": {pkgName: './bin/a'}
  normalize(pkgJSON);
  const bin = pkgJSON.bin || {};
  const reverseBinMap = {};
  for (const [ binName, binPath ] of Object.entries(bin)) {
    const normalizedBinPath = path.normalize(binPath);
    if (!reverseBinMap[normalizedBinPath]) {
      /**
       * 使用数组，存在同一个 bin 文件，需要建多个 bin 指令
       * "bin": {
       *    "a": "test.js",
       *    "a-cli": "test.js"
       * }
       */
      reverseBinMap[path.normalize(binPath)] = [];
    }

    reverseBinMap[path.normalize(binPath)].push(binName);
  }
  return reverseBinMap;
}

function getFileEntryMode(pkgId, pkg, entry) {
  const relatedPath = entry.name.substr(pkgId.length + 1);
  const reverseBinMap = resolveBinMap(pkg);
  // 原始 bin 文件，非 reg 类型
  if (reverseBinMap[path.normalize(relatedPath)] || entry.type !== 'reg') {
    return 0o755;
  }

  return entry.mode || 0o644;
}

function getEnv(originEnv, args = []) {
  const env = { ...originEnv };
  env.npm_config_argv = JSON.stringify({
    remain: [],
    cooked: args,
    original: args,
  });

  const parsedArgs = { 'no-save': args.includes('--no-save') };
  Object.assign(parsedArgs, parser(args, {
    string: [
      'root',
      'registry',
      'prefix',
      'forbidden-licenses',
      'custom-china-mirror-url',
      // {"http://a.com":"http://b.com"}
      'tarball-url-mapping',
      'proxy',
      // --high-speed-store=filepath
      'high-speed-store',
      'dependencies-tree',
    ],
    boolean: [
      'version',
      'help',
      'production',
      'client',
      'global',
      'save',
      'save-dev',
      'save-optional',
      'save-client',
      'save-build',
      'save-isomorphic',
      // Saved dependencies will be configured with an exact version rather than using npm's default semver range operator.
      'save-exact',
      'china',
      'ignore-scripts',
      // install ignore optionalDependencies
      'optional',
      'detail',
      'trace',
      'engine-strict',
      'flatten',
      'registry-only',
      'cache-strict',
      'fix-bug-versions',
      'prune',
      // disable dedupe mode https://docs.npmjs.com/cli/dedupe, back to npm@2 mode
      // please don't use on frontend project
      'disable-dedupe',
      'save-dependencies-tree',
      'force-link-latest',
    ],
    default: {
      optional: true,
    },
    alias: {
      // npm install [-S|--save|-D|--save-dev|-O|--save-optional] [-E|--save-exact] [-d|--detail]
      S: 'save',
      D: 'save-dev',
      O: 'save-optional',
      E: 'save-exact',
      v: 'version',
      h: 'help',
      g: 'global',
      c: 'china',
      r: 'registry',
      d: 'detail',
    },
  }));
  // npm cli will auto set options to npm_xx env.
  for (const key in parsedArgs) {
    const value = parsedArgs[key];
    if (value && typeof value === 'string') {
      env['npm_config_' + key] = value;
    }
  }
  return env;
}

// subPath === '' 时，为根目录
async function getWorkdir(cwd, subPath = '', csiDir) {
  const workdirHash = crypto.createHash('md5').update(cwd).digest('hex');
  const dirname = `${path.basename(cwd)}_${workdirHash}`;
  const workdir = path.join(baseRapidModeDir(), dirname);
  const hash = crypto.createHash('md5').update(subPath).digest('hex');
  const prefix = `${(subPath || 'root').replace('/', '_')}_${hash}`;
  let bootstrap;
  if (csiDir) {
    bootstrap = path.join(csiDir, path.join(dirname, prefix, nydusdBootstrapFile).replace(/\//g, '_'));
  } else {
    bootstrap = path.join(workdir, prefix, nydusdBootstrapFile);
  }

  return {
    projectDir: workdir,
    prefix,
    dirname: path.join(dirname, prefix),
    baseDir: path.join(workdir, prefix), // .rapid/cache/xxx
    volumeName: 'rapid-' + prefix, // xxx
    tmpDmg: path.join(workdir, prefix, 'tmp.dmg'), // .rapid/cache/xxx/overlay
    overlay: path.join(workdir, prefix, 'overlay'), // .rapid/cache/xxx/overlay
    upper: path.join(workdir, prefix, 'overlay', 'upper'), // .rapid/cache/xxx/overlay/upper
    workdir: path.join(workdir, prefix, 'overlay', 'workdir'), // .rapid/cache/xxx/overlay/workdir
    mnt: path.join(nydusdMnt, dirname, prefix), // .rapid/cache/mnt/xxx
    tarIndex: path.join(workdir, prefix, 'tar.index.json'), // .rapid/cache/xxx/tar.index.json
    bootstrap, // .rapid/cache/xxx/nydusd-bootstrap
    depsJSONPath: path.join(workdir, prefix, 'overlay', 'upper', '.package-lock.json'), // .rapid/cache/xxx/overlay/upper/.package-lock.json，服务端生成依赖树文件，需要写到 upperdir
    nodeModulesDir: path.join(cwd, subPath, 'node_modules'),
    csiMountId: path.join(workdir, prefix, 'csi_mount_id.txt'),
  };
}

/**
 * 判断一个包是否需要在当前生产模式及当前系统环境中安装
 * @param {*} pkg -
 * @param {boolean} productionMode -
 * @param {NodeJS.Architecture?} arch -
 * @param {NodeJS.Platform?} platform -
 * @return {boolean} 是否是有效的依赖
 */
function validDep(pkg, productionMode, arch, platform) {
  const targetArch = arch || process.arch;
  const targetOS = platform || process.platform;

  if (productionMode === true && pkg.dev === true) {
    return false;
  }

  if (pkg.optional === true) {
    return verifyNpmConstraint(pkg.os, targetOS) && verifyNpmConstraint(pkg.cpu, targetArch);
  }

  return true;

}

exports.getAllPkgPaths = async function getAllPkgPaths(cwd, pkg) {
  const workspaces = await exports.getWorkspaces(cwd, pkg);
  const allPkgs = Object.values(workspaces);
  // root pkg
  allPkgs.push('');
  return allPkgs;
};

exports.getWorkspaces = async function getWorkspaces(cwd, pkg) {
  const workspaces = await mapWorkspaces({
    cwd,
    pkg,
  });

  const workspacesMap = {};

  for (const dir of workspaces.values()) {
    const pkgJSON = require(path.join(dir, 'package.json'));
    workspacesMap[pkgJSON.name] = path.relative(cwd, dir);
  }

  return workspacesMap;
};

function setNpmPackageEnv(env, key, value) {
  const t = typeof value;
  if (t === 'string' || t === 'number' || t === 'boolean') {
    env[`npm_package_${key}`] = value;
  } else if (value === null) {
    env[`npm_package_${key}`] = 'null';
  } else if (value) {
    for (const subkey in value) {
      setNpmPackageEnv(env, `${key}_${subkey}`, value[subkey]);
    }
  }
}

exports.runScript = async (pkgDir, script, options) => {
  // merge config.env <= process.env <= options.env
  const env = {
    // show node-pre-gyp http info
    // like "node-pre-gyp http GET https://npmmirror.com/mirrors/fsevents/v1.0.6/fse-v1.0.6-node-v46-darwin-x64.tar.gz"
    npm_config_loglevel: 'http',
  };

  for (const key in process.env) {
    // ignore `Path` env on Windows
    if (/^path$/i.test(key)) {
      continue;
    }
    env[key] = process.env[key];
  }

  for (const key in options.env) {
    // ignore `Path` env on Windows
    if (/^path$/i.test(key)) {
      continue;
    }
    env[key] = options.env[key];
  }

  // set npm_package_* env from package.json
  try {
    const pkg = require(path.join(pkgDir, 'package.json'));
    for (const key in pkg) {
      setNpmPackageEnv(env, key, pkg[key]);
    }
  } catch (error) {
    // ignore error
  }
  env.PATH = [
    path.join(__dirname, '../node-gyp-bin'),
    path.join(options.cwd, 'node_modules', '.bin'),
    path.join(pkgDir, 'node_modules', '.bin'),
    process.env.PATH,
  ].join(path.delimiter);

  // ignore npm ls error
  // e.g.: npm ERR! extraneous: base64-js@1.1.2
  let ignoreError = false;
  if (/^npm (ls|list)$/.test(script)) {
    ignoreError = true;
  }

  try {
    const res = await execa.command(script, {
      cwd: pkgDir,
      env,
      stdio: 'inherit',
      shell: true,
    });
    return res.stdout;
  } catch (err) {
    if (ignoreError) {
      options.console.info('[rapid:runscript] ignore runscript error: %s', err);
    } else {
      throw err;
    }
  }
};

exports.saveLockFile = async function saveLockFile(cwd, lockfile, lockId) {
  const lockfilePath = path.join(cwd, 'package-lock.json');
  const lockfileData = `${JSON.stringify(lockfile, null, 2)}${os.EOL}`;
  await fs.writeFile(lockfilePath, lockfileData, 'utf-8');
  lockId && await fs.writeFile(path.join(cwd, '.lock-id.txt'), lockId, 'utf-8');
};

exports.sleep = async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
};

exports.findLocalPrefix = function(p) {
  p = p || process.cwd();
  const pkg = path.join(p, 'package.json');
  // 如果没有 package.json 这时候直接返回 process.cwd()
  if ((p === '/' || p.match(/^[a-z]:\\$/gi)) && !existsSync(pkg)) {
    return process.cwd();
  }
  if (existsSync(pkg)) {
    return p;
  }
  return exports.findLocalPrefix(path.resolve(p, '..'));
};

exports.readPkgJSON = async function readPkgJSON(cwd) {
  const pkgPath = path.join(cwd || exports.findLocalPrefix(), './package.json');
  let pkg = {};
  try {
    pkg = JSON.parse(await fs.readFile(pkgPath, 'utf8'));
  } catch (_) {
    // pkg not found, or is not a valid json
    pkg = null;
  }
  return { pkg, pkgPath };
};

exports.readPackageLock = async function readPackageLock(cwd) {
  const lockPath = path.join(cwd || exports.findLocalPrefix(), './package-lock.json');
  const packageLock = JSON.parse(await fs.readFile(lockPath, 'utf8'));
  return { packageLock, lockPath };
};

// 列出当前 mount 的 fuse endpoint
// 目前只支持 fuse-t
exports.listMountInfo = async function listMountInfo() {

  const { stdout } = await execa('mount');
  // 拆分输出为每行
  const mountLines = stdout.split('\n');

  return mountLines.filter(_ => {
    if (_.includes(nydusdMnt)) {
      return false;
    }
    return _.includes(baseRapidModeDir()) || _.startsWith('fuse');
  }).map(line => {
    const parts = line.split(' ');
    const device = parts[0];
    const mountPoint = parts[2];
    // const options = parts.slice(3).join(' ');
    return { device, mountPoint };
  }).sort((a, b) => a.device.localeCompare(b.device));
};

exports.getWorkdir = getWorkdir;
exports.validDep = validDep;
exports.getDisplayName = getDisplayName;
exports.wrapSudo = wrapSudo;
exports.createNydusdConfigFile = createNydusdConfigFile;
exports.shouldFuseSupport = shouldFuseSupport;
exports.getPackagePath = getPackagePath;
exports.getPkgNameFromTarballUrl = getPkgNameFromTarballUrl;
exports.generatePackageId = generatePackageId;
exports.generateBin = generateBin;
exports.getPackageNameFromPackagePath = getPackageNameFromPackagePath;
exports.getAliasPackageNameFromPackagePath = getAliasPackageNameFromPackagePath;
exports.rootDir = rootDir;
exports.verifyNpmConstraint = verifyNpmConstraint;
exports.generateSymbolLink = generateSymbolLink;
exports.isFlattenPackage = isFlattenPackage;
exports.resolveBinMap = resolveBinMap;
exports.getFileEntryMode = getFileEntryMode;
exports.getEnv = getEnv;
