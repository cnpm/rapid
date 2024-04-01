const urllib = require('urllib');
const debug = require('node:util').debuglog('rapid:deamon');
const AutoLaunch = require('auto-launch');
const path = require('node:path');
const fs = require('node:fs/promises');
const { rsBindingPath } = require('@cnpmjs/binding');
const execa = require('execa');

const {
  baseRapidModeDir,
  nydusd,
  nydusdConfigFile,
  nydusdMnt,
  socketPath,
  nydusdLogFile,
} = require('./constants');

const deamonDir = path.join(baseRapidModeDir(), 'project');

const metadataDir = path.join(deamonDir, 'metadata');

const deamonSocketPath = path.join(deamonDir, 'socket_path');

const rapidDeamon = rsBindingPath
  ? path.join(rsBindingPath, 'rapid_deamon')
  : undefined;


const destinationFilePath = path.join(deamonDir, 'rapid_deamon');

const daemonPoint = 'http://unix';
const aliveUrl = `${daemonPoint}/alive`;
const killUrl = `${daemonPoint}/kill`;
const projectUrl = `${daemonPoint}/project`;

const checkDeamonAlive = async () => {
  try {
    const result = await urllib.request(`${aliveUrl}`, {
      method: 'GET',
      socketPath: deamonSocketPath,
      timeout: 1000,
    });
    return result.status === 200;
  } catch (error) {
    debug('checkDeamonAlive error: ', error);
    return false;
  }
};

const delProject = async projectName => {
  let config;
  try {
    await fs.stat(metadataDir);
  } catch (error) {
    debug('delProject error: ', error);
    return false;
  }
  const configPath = path.join(metadataDir, `${projectName}.json`);
  try {
    const configBuffer = await fs.readFile(configPath);
    config = JSON.parse(configBuffer.toString());
  } catch (error) {
    debug('parse json error: ', error);
  }

  try {
    await fs.rm(`${configPath}`);
  } catch (error) {
    debug('rm json error: ', error);
    return false;
  }

  try {
    const result = await urllib.request(`${projectUrl}`, {
      method: 'DELETE',
      data: { projectPath: config.projectPath },
      dataType: 'json',
      contentType: 'json',
      socketPath: deamonSocketPath,
    });
    return result.status === 200 && result.data?.code === 0;
  } catch (error) {
    debug('delProject error: ', error);
    return false;
  }
};

const addProject = async config => {
  try {
    await fs.mkdir(metadataDir, { recursive: true });
    await fs.writeFile(path.join(metadataDir, `${config.projectName}.json`), JSON.stringify(config, null, 2));
    const result = await urllib.request(`${projectUrl}`, {
      method: 'POST',
      data: config,
      dataType: 'json',
      contentType: 'json',
      socketPath: deamonSocketPath,
    });
    return result.status === 200 && result.data?.code === 0;
  } catch (error) {
    debug('addProject error: ', error);
    return false;
  }
};

const compareVersions = (version1, version2) => {
  if (!version1 || !version2) {
    return true;
  }
  const v1Parts = version1.split('.');
  const v2Parts = version2.split('.');

  const maxLength = Math.max(v1Parts.length, v2Parts.length);

  for (let i = 0; i < maxLength; i++) {
    const v1Part = parseInt(v1Parts[i] || 0);
    const v2Part = parseInt(v2Parts[i] || 0);

    if (v1Part > v2Part) {
      return false;
    } else if (v1Part < v2Part) {
      return true;
    }
  }

  return false; // version1 === version2
};

const runDeamon = async () => {
  const subprocess = execa(destinationFilePath, [], {
    detached: true,
    stdio: 'ignore',
  });

  subprocess.unref();

  let count = 0;

  while (count < 10) {
    const res = await checkDeamonAlive();
    if (res) {
      return true;
    }
    count++;
  }

  return false;
};


const killDeamon = async () => {
  try {
    const result = await urllib.request(`${killUrl}`, {
      method: 'GET',
      socketPath: deamonSocketPath,
    });
    return result.status === 200;
  } catch (error) {
    debug('killDeamon error: ', error);
    return false;
  }
};

const registerDeamon = async () => {
  try {
    await execa.command('killall -9 rapid_deamon');

    await execa.command(`umount -f ${nydusdMnt}`);

    await execa.command('killall -9 nydusd');
  } catch (error) {
    debug('umount deamon error: ', error);
  }

  await fs.rm(deamonDir, { recursive: true, force: true });

  await fs.mkdir(deamonDir, { recursive: true });

  await fs.copyFile(path.join(__dirname, '../package.json'), path.join(deamonDir, 'package.json'));

  const nydusConfigPath = path.join(deamonDir, 'nydus_config.json');

  await fs.writeFile(nydusConfigPath, JSON.stringify({
    nydusdBin: nydusd,
    nydusdConfigFile,
    nydusdMnt,
    socketPath,
    nydusdLogFile,
  }, null, 2));

  const logConfigPath = path.join(deamonDir, 'log4rs.yaml');

  await fs.writeFile(logConfigPath, `
refresh_rate: 86400 seconds

appenders:
  file:
    kind: file
    path: "${path.join(deamonDir, '/logs/rapid-deamon-output.log')}"
    encoder:
      pattern: "{d} - {l} - {m}{n}"

root:
  level: info
  appenders:
    - file
  `);
  await fs.copyFile(rapidDeamon, destinationFilePath);

  await fs.chmod(destinationFilePath, '777');

  const deamonAutoLauncher = new AutoLaunch({
    name: 'rapid_deamon',
    path: destinationFilePath,
    mac: {
      useLaunchAgent: true,
    },
  });

  deamonAutoLauncher.enable();

  try {
    const isEnabled = deamonAutoLauncher.isEnabled();
    if (isEnabled) return;
    deamonAutoLauncher.enable();
  } catch (e) {
    console.log(e);
  }
};

const initDeamon = async () => {
  try {
    const rapidVersion = require(path.join(__dirname, '../package.json')).deamonVersion;
    const deamonVersion = require(path.join(deamonDir, './package.json')).deamonVersion;

    if (compareVersions(deamonVersion, rapidVersion)) {
      const err = '[rapid] rapid and deamon version not match';
      console.info(err);
      throw Error(err);
    }

    const isRunning = await checkDeamonAlive();
    if (isRunning) {
      console.info('[rapid] rapid daemon is running already.');
      return;
    }
    await fs.mkdir(deamonDir, { recursive: true });

    await fs.mkdir(nydusdMnt, { recursive: true });

    await fs.stat(destinationFilePath);
  } catch (e) {
    await registerDeamon();
  } finally {
    await runDeamon();
  }
};

exports.initDeamon = initDeamon;
exports.delProject = delProject;
exports.addProject = addProject;
exports.killDeamon = killDeamon;
