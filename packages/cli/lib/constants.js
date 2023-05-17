'use strict';

const path = require('node:path');
const os = require('node:os');

const homedir = () => process.env.HOME || os.homedir();
const platform = process.platform;
const arch = process.arch;
let rsBindingPath;
try {
  rsBindingPath = path.dirname(require.resolve(`@cnpmjs/binding-${platform}-${arch}`, {
    paths: [
      require.resolve('@cnpmjs/binding'),
    ],
  }));
} catch (_) {
  // ...
}

const baseRapidModeDir = () => path.join(homedir(), '.rapid', 'cache');
// 依赖 tar 文件目录
const tarBucketsDir = path.join(baseRapidModeDir(), 'tar_buckets');

// nydusd fuse 挂载全部依赖目录
const nydusdMnt = path.join(baseRapidModeDir(), 'mnt');

// npm 包本地缓存信息
const npmCacheConfigPath = path.join(tarBucketsDir, 'npm.config.json');

// nydusd 可执行文件，支持 x64 和 arm64 架构的 Linux/macOS
const nydusd = rsBindingPath
  ? path.join(rsBindingPath, 'nydusd')
  : undefined;

// unionfs-fuse 可执行文件，支持 x64 和 arm64 架构的 macOS
// see doc/DEVELOPER.md
const unionfs = rsBindingPath
  ? path.join(rsBindingPath, 'unionfs')
  : undefined;

// nydusd 配置文件
const nydusdConfigFile = path.join(baseRapidModeDir(), './nydus-config.json');
// nydusd API socket
const socketPath = path.join(baseRapidModeDir(), 'nydusd.sock');
// nydusd log file
const nydusdLogFile = path.join(baseRapidModeDir(), 'nydusd.log');

// nydusd 构造 inode bootstrap 文件
const nydusdBootstrapFile = 'nydusd-bootstrap';

const NYDUS_CSI_SOCKET_ENV = 'COM_ALIPAY_CSI_NYDUS_SOCK';
const NYDUS_CSI_ROOT_ENV = 'COM_ALIPAY_CSI_NYDUS_VOLUME_ROOT';
const NYDUS_CSI_BLOB_ROOT = '/shared';
const NYDUS_CSI_VOLUME_ID_ENV = 'COM_ALIPAY_CSI_NYDUS_VOLUME_ID';
const BOOTSTRAP_BIN = rsBindingPath
  ? path.join(rsBindingPath, 'nydusd-bootstrap')
  : undefined;


const NpmFsMode = {
  NPM: 'npm',
  NPMINSTALL: 'npminstall',
};

const PREFIX_LENGTH = 'node_modules/'.length;

exports.NpmFsMode = NpmFsMode;
exports.PREFIX_LENGTH = PREFIX_LENGTH;
exports.baseRapidModeDir = baseRapidModeDir;
exports.nydusdConfigFile = nydusdConfigFile;
exports.tarBucketsDir = tarBucketsDir;
exports.npmCacheConfigPath = npmCacheConfigPath;
exports.socketPath = socketPath;
exports.nydusdMnt = nydusdMnt;
exports.nydusdBootstrapFile = nydusdBootstrapFile;
exports.nydusd = nydusd;
exports.unionfs = unionfs;
exports.nydusdLogFile = nydusdLogFile;
exports.NYDUS_CSI_SOCKET_ENV = NYDUS_CSI_SOCKET_ENV;
exports.NYDUS_CSI_ROOT_ENV = NYDUS_CSI_ROOT_ENV;
exports.NYDUS_CSI_BLOB_ROOT = NYDUS_CSI_BLOB_ROOT;
exports.NYDUS_CSI_VOLUME_ID_ENV = NYDUS_CSI_VOLUME_ID_ENV;
exports.BOOTSTRAP_BIN = BOOTSTRAP_BIN;
exports.NYDUS_TYPE = {
  FUSE: 'FUSE',
  NATIVE: 'NATIVE',
};
