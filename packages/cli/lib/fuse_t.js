const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');
const urllib = require('urllib');
const execa = require('execa');
const os = require('node:os');
const inquirer = require('inquirer');


const FUSE_T_INSTALL_PATH = '/usr/local/bin/go-nfsv4';
const FUSE_T_VERSION = '1.0.28';
const FUSE_T_DOWNLOAD_URL = `https://registry.npmmirror.com/-/binary/fuse-t/${FUSE_T_VERSION}/fuse-t-macos-installer-${FUSE_T_VERSION}.pkg`;

exports.checkFuseT = async function checkFuseT() {
  // only check for darwin
  if (os.platform() !== 'darwin') return true;
  try {
    await fs.stat(FUSE_T_INSTALL_PATH);
    return true;
  } catch {
    return false;
  }
};

exports.installFuseT = async function installFuseT() {
  const tmpPath = path.join('/tmp', `${crypto.randomUUID()}.pkg`);
  await urllib.request(FUSE_T_DOWNLOAD_URL, {
    method: 'GET',
    writeStream: fsSync.createWriteStream(tmpPath),
    followRedirect: true,
  });
  await execa.command(`sudo installer -pkg ${tmpPath}  -target /`);
};

exports.confirmInstallFuseT = async function confirmInstallFuseT() {
  if (process.env.INSTALL_FUSE_T === 'true') return true;
  if (!process.stdout.isTTY) return false;
  const answers = await inquirer.prompt([{
    type: 'confirm',
    name: 'installFuseT',
    message: 'Do you want install fuse-t? It may take a few seconds',
    default: true,
  }]);
  return answers.installFuseT === true;
};
