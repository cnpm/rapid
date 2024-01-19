const urllib = require('urllib');
const AutoLaunch = require('auto-launch');
const path = require('node:path');
const fs = require('node:fs/promises');
const { chmodSync } = require('node:fs');
const {
  rsBindingPath,
  nydusd,
  nydusdConfigFile,
  nydusdMnt,
  socketPath,
  nydusdLogFile,
} = require('@cnpmjs/binding');
const execa = require('execa');

const {
  baseRapidModeDir,
} = require('../constants');

const deamonDir = path.join(baseRapidModeDir(), 'project');

const metadataDir = path.join(deamonDir, 'metadata');

const rapidDeamon = rsBindingPath
  ? path.join(rsBindingPath, 'rapid_deamon')
  : undefined;

const daemonPoint = 'http://localhost:33889';
const aliveUrl = `${daemonPoint}/alive`;
const delUrl = `${daemonPoint}/del-project`;
const addUrl = `${daemonPoint}/add-project`;

const checkDeamonAlive = async () => {
  try {
    const result = await urllib.request(`${aliveUrl}`, {
      method: 'GET',
    });
    return result.status === 200;
  } catch (_) {
    return false;
  }
};

const delProject = async projectName => {
  let config;
  try {
    await fs.stat(metadataDir);
    const configPath = path.join(metadataDir, `${projectName}.json`);
    const configBuffer = await fs.readFile(configPath);

    config = JSON.parse(configBuffer.toString());
    await fs.rm(`${projectName}.json`);
  } catch (_) {
    return true;
  }

  try {
    const result = await urllib.request(`${delUrl}`, {
      method: 'POST',
      data: { projectPath: config.projectPath },
    });
    return result.status === 200;
  } catch (_) {
    return false;
  }
};

const addProject = async config => {
  try {
    await fs.mkdir(metadataDir, { recursive: true });
    await fs.writeFile(path.join(metadataDir, `${config.projectName}.json`), JSON.stringify(config, null, 2));
    const result = await urllib.request(`${addUrl}`, {
      method: 'POST',
      data: config,
    });
    return result.status === 200;
  } catch (_) {
    return false;
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

  const destinationFilePath = path.join(deamonDir, 'rapid_deamon');

  try {
    await fs.stat(destinationFilePath);
    await execa.command(destinationFilePath);
  } catch (_) {

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
      path: "logs/rapid-deamon-output.log"
      encoder:
        pattern: "{d} - {l} - {m}{n}"
  
  root:
    level: info
    appenders:
      - file
    `);

    await fs.copyFile(rapidDeamon, destinationFilePath);

    chmodSync(destinationFilePath, '755');

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
  }
};

exports.initDeamon = initDeamon;
exports.delProject = delProject;
exports.addProject = addProject;
