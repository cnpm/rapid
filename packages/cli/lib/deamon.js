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


const runDeamon = async () => {
  execa(destinationFilePath, [], {
    detached: true,
    stdio: [ 'ignore', 'pipe', 'pipe' ],
  });

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
  const isRunning = await checkDeamonAlive();
  if (isRunning) {
    console.info('[rapid] rapid daemon is running already.');
    return;
  }
  await fs.mkdir(deamonDir, { recursive: true });

  await fs.mkdir(nydusdMnt, { recursive: true });

  try {
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
