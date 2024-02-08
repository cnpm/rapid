'use strict';

const path = require('node:path');
const fs = require('node:fs/promises');
const {
  npmCacheConfigPath,
  npmIndexConfigPath,
} = require('./constants');
const util = require('./util');
const NpmBlobManager = require('./npm_blob_manager');
const NpmFs = require('./npm_fs');
const { NpmFsMode } = require('./constants');
const Downloader = require('./downloader');

/**
 * @param {NpmBlobManger} blobManager -
 * @return {(function(*))|*} -
 */
function entryListenerFactory(blobManager) {
  return function entryListener(entry) {
    // 路径为 packages/package.json
    // 其他路径如 packages/test/package.json 则忽略
    if (entry.entryName.split('/').length !== 2) {
      return;
    }

    // packages/binding.gyp
    if (entry.entryName.includes('binding.gyp')) {
      blobManager.setGyp(entry.pkgName);
    } else {
      // packages/package.json
      blobManager.addPackage(JSON.parse(entry.content));
    }
  };
}

async function download(options) {
  // 1. resolve dependencies
  // 2. download tar
  //   - listen and store package entry
  // 3. prepare preInstall/postInstall scripts

  const blobManager = new NpmBlobManager();
  const entryListener = entryListenerFactory(blobManager);

  const downloader = new Downloader({
    entryListener,
    productionMode: options.productionMode,
    registries: options.registries,
  });
  await downloader.init();

  options.downloader = downloader;
  const depsTree = options.depsTree;

  await downloader.download(depsTree);
  const { tocMap, indices } = downloader.dumpdata;
  await downloader.shutdown();
  console.log('[rapid] download finished');

  for (const [ blobId, tocIndex ] of Object.entries(tocMap)) {
    blobManager.addBlob(blobId, tocIndex);
  }

  for (const [ packagePath, depPkg ] of Object.entries(depsTree.packages)) {
    const { version, resolved, link, inBundle, optional } = depPkg;
    // 不需要下载 tgz 的情形
    // 1. "" 为项目依赖
    // 2. 软链，monorepo 子包
    // 3. bundleDependencies
    // 4. optionalDependencies 无 resolved 字段
    if (!packagePath.startsWith('node_modules') || link === true || inBundle === true || (optional && !resolved)) {
      continue;
    }
    if (!resolved) {
      console.error(`[rapid] can not resolve ${packagePath}`);
    }
    const pkgName = util.getPkgNameFromTarballUrl(resolved);
    const pkg = blobManager.getPackage(pkgName, version);
    // optionalDependencies or devDependencies in production mode
    const isValidDep = util.validDep(depPkg, options.productionMode);
    if (!pkg) {
      if (isValidDep) {
        const pkgId = util.generatePackageId(pkgName, version);
        throw new Error(`not found package json for ${pkgId}`);
      }
    } else {
      let packageStorePath = packagePath;
      if (options.mode === NpmFsMode.NPMINSTALL) {
        packageStorePath = path.join('./node_modules', util.getDisplayName(pkg, options.mode));
      }
      if (isValidDep) {
        const pkgId = util.generatePackageId(pkgName, version);
        options.scripts.storeLifecycleScripts(pkg, packageStorePath, optional, blobManager.hasGyp(pkgId));
      }
    }
  }

  console.log('[rapid] generate fs meta');


  const npmFs = new NpmFs(blobManager, options);
  const allPkgs = await util.getAllPkgPaths(options.cwd, options.pkg);

  await Promise.all(allPkgs.map(async pkgPath => {
    const { tarIndex } = await util.getWorkdir(options.cwd, pkgPath);
    const fsMeta = await npmFs.getFsMeta(depsTree, pkgPath);
    await fs.mkdir(path.dirname(tarIndex), { recursive: true });
    await fs.writeFile(tarIndex, JSON.stringify(fsMeta), 'utf8');
  }));

  // FIXME atomic write
  await fs.writeFile(npmCacheConfigPath, JSON.stringify(tocMap), 'utf8');
  await fs.writeFile(npmIndexConfigPath, JSON.stringify(indices), 'utf8');
  return {
    depsTree,
  };
}

exports.download = download;
