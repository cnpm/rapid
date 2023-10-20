'use strict';

const debug = require('node:util').debuglog('rapid:nydusd_api');
const fs = require('node:fs/promises');
const urllib = require('urllib');
const execa = require('execa');
const awaitEvent = require('await-event');
const util = require('../util');

const {
  nydusd,
  nydusdConfigFile,
  nydusdMnt,
  nydusdLogFile,
  socketPath,
  tarBucketsDir,
} = require('../constants');
const { wrapSudo, getWorkdir } = require('../util');

// see all APIs at: https://github.com/dragonflyoss/image-service/blob/master/api/openapi/nydus-rs.yaml
const endpoint = 'http://unix/api/v1';
const mountUrl = `${endpoint}/mount`;
const daemonUrl = `${endpoint}/daemon`;

const nydusdConfig = JSON.stringify({
  device: {
    backend: {
      type: 'localfs',
      config: {
        dir: tarBucketsDir,
        readahead: true,
      },
    },
  },
  mode: 'direct',
  digest_validate: false, // skip entry shasum check
  iostats_files: false, // skip profile file generation
});

async function isDaemonRunning() {
  try {
    const result = await urllib.request(`${daemonUrl}`, {
      method: 'GET',
      socketPath,
    });
    return result.status === 200;
  } catch (_) {
    return false;
  }
}

// 启动 nydusd daemon
async function initDaemon(nydusdBin = '') {
  nydusdBin = nydusdBin || nydusd;
  const isRunning = await isDaemonRunning();
  // 已经启动了，直接返回
  if (isRunning) {
    console.info('[rapid] nydusd daemon is running already.');
    return;
  }

  console.time('[rapid] start nydusd daemon');
  await fs.mkdir(nydusdMnt, { recursive: true });
  let subprocess;
  let args;
  if (process.platform === 'linux') {
    args = [
      nydusdBin,
      '--config', nydusdConfigFile,
      '--mountpoint', nydusdMnt,
      '--apisock', socketPath,
      '--log-file', nydusdLogFile,
    ];
    subprocess = execa('sudo', args, {
      detached: true,
      stdio: [ 'ignore', 'pipe', 'pipe' ],
    });
    console.info('[rapid] startNydusd: %s', args.join(' '));
  } else {
    args = [
      '--config', nydusdConfigFile,
      '--mountpoint', nydusdMnt,
      '--apisock', socketPath,
      '--log-file', nydusdLogFile,
    ];
    subprocess = execa(nydusdBin, args, {
      detached: true,
      stdio: [ 'ignore', 'pipe', 'pipe' ],
    });
    console.info('[rapid] startNydusd: %s %s', nydusdBin, args.join(' '));
  }

  subprocess.unref();

  const signalCode = await Promise.race([
    awaitEvent(subprocess, 'exit'),
    checkDaemon(),
  ]);

  if (signalCode === 1) {
    throw new Error('nydusd daemon start failed');
  }
  console.timeEnd('[rapid] start nydusd daemon');
}

async function checkDaemon() {
  // 最多等 3 秒
  const maxWaitDuration = 3000;
  const startTime = Date.now();
  let signalCode = 1;
  while (signalCode === 1) {
    try {
      const result = await urllib.request(`${daemonUrl}`, {
        method: 'GET',
        socketPath,
      });
      if (result.status === 200) {
        signalCode = 0;
        break;
      }
    } catch (error) {
      console.info('[rapid] mount nydusd is not ready, waiting...');
      debug('mount error: ', error);
      // linux 下需要用 sudo 启动，如果没有权限，这里
      if (error.code === 'EACCES' && process.platform === 'linux') {
        await execa.command(wrapSudo(`chmod 777 ${socketPath}`));
      }
      if (Date.now() - startTime <= maxWaitDuration) {
        await util.sleep(100);
      } else {
        throw error;
      }
    }
  }

  return signalCode;
}

// 优雅退出 nydusd daemon
async function exitDaemon() {
  try {
    await urllib.request(`${daemonUrl}/exit`, {
      method: 'PUT',
      socketPath,
      dataType: 'json',
    });
  } catch (e) {
    // ignore, nydusd quits with error, but it's ok
    e.message = 'exit nydusd faield: ' + e.message;
    console.warn(e);
  }
}

// macos fuse-t 中暂未实现 fuse 的优雅退出只能 umount 之后
// 强制杀掉进程
async function forceExitDaemon() {
  try {
    await execa.command(`umount -f ${nydusdMnt}`);
    await execa.command('killall -9 nydusd');
  } catch (e) {
    // ignore, nydusd quits with error, but it's ok
    e.message = 'exit nydusd faield: ' + e.message;
    console.warn(e);
  }
}

async function mount(mountpoint, cwd, bootstrap = '') {
  const workDir = await getWorkdir(cwd);
  const result = await urllib.request(`${mountUrl}?mountpoint=${mountpoint}`, {
    method: 'POST',
    socketPath,
    data: {
      source: bootstrap || workDir.bootstrap,
      fs_type: 'rafs',
      config: nydusdConfig,
    },
    contentType: 'json',
    dataType: 'json',
  });
  debug('mount result: %j', result);
}

// 重新配置挂载点
async function remount(mountpoint, cwd, bootstrap = '') {
  const workDir = await getWorkdir(cwd);
  const result = await urllib.request(`${mountUrl}?mountpoint=${mountpoint}`, {
    method: 'PUT',
    socketPath,
    data: {
      source: bootstrap || workDir.bootstrap,
      fs_type: 'rafs',
      config: nydusdConfig,
    },
    dataType: 'json',
    contentType: 'json',
  });
  debug('remount result: %j', result);
}

// 卸载挂载点
async function umount(mountpoint) {
  const result = await urllib.request(`${mountUrl}?mountpoint=${mountpoint}`, {
    method: 'DELETE',
    socketPath,
  });
  debug('umount result: %j', result);
}

// 查询当前挂载信息
async function list() {
  const result = await urllib.request(`${daemonUrl}`, {
    method: 'GET',
    socketPath,
    dataType: 'json',
  });

  if (result.status === 200 && result.data.state === 'RUNNING') {
    return Object.values(result.data.backend_collection);
  }
}

exports.mount = mount;
exports.remount = remount;
exports.umount = umount;
exports.initDaemon = initDaemon;
exports.exitDaemon = exitDaemon;
exports.forceExitDaemon = forceExitDaemon;
exports.isDaemonRunning = isDaemonRunning;
exports.list = list;
