'use strict';

const path = require('node:path');
const fs = require('node:fs/promises');
const {
  tarBucketsDir,
  npmCacheConfigPath,
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
  console.info('[rapid] removing tar buckets. dir: %s', tarBucketsDir);
  const { baseDir } = await util.getWorkdir(options.cwd);
  // 防止多次安装，realBucketCount 不同时数据错乱
  await fs.rm(tarBucketsDir, { recursive: true, force: true });
  await fs.rm(baseDir, { recursive: true, force: true });

  const blobManager = new NpmBlobManager();
  const entryListener = entryListenerFactory(blobManager);
  const downloader = new Downloader({
    entryListener,
    productionMode: options.productionMode,
  });
  await downloader.init();
  options.downloader = downloader;
  const depsTree = options.depsTree;

  console.time('[rapid] parallel download time');
  const tocIndexes = await downloader.download(depsTree);
  await downloader.shutdown();

  for (const [ blobId, tocIndex ] of Object.entries(tocIndexes)) {
    blobManager.addBlob(blobId, tocIndex);
  }

  for (const [ packagePath, depPkg ] of Object.entries(depsTree.packages)) {
    const { version, resolved, link, inBundle, optional } = depPkg;
    if (!packagePath.startsWith('node_modules') || link === true || inBundle === true) {
      continue;
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
  console.timeEnd('[rapid] parallel download time');
  console.time('[rapid] generate fs meta');
  const npmFs = new NpmFs(blobManager, options);
  const allPkgs = await util.getAllPkgPaths(options.cwd, options.pkg);
  await Promise.all(allPkgs.map(async pkgPath => {
    const { tarIndex } = await util.getWorkdir(options.cwd, pkgPath);
    const fsMeta = await npmFs.getFsMeta(depsTree, pkgPath);
    await fs.mkdir(path.dirname(tarIndex), { recursive: true });
    await fs.writeFile(tarIndex, JSON.stringify(fsMeta), 'utf8');
  }));
  await fs.writeFile(npmCacheConfigPath, JSON.stringify(tocIndexes), 'utf8');
  console.timeEnd('[rapid] generate fs meta');
  return {
    depsTree,
  };
}

exports.download = download;
