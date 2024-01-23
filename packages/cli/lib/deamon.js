const urllib = require('urllib');
const AutoLaunch = require('auto-launch');
const path = require('node:path');
const fs = require('node:fs/promises');
const { chmodSync } = require('node:fs');
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

const rapidDeamon = rsBindingPath
  ? path.join(rsBindingPath, 'rapid_deamon')
  : undefined;


const destinationFilePath = path.join(deamonDir, 'rapid_deamon');

const daemonPoint = 'http://localhost:33889';
const aliveUrl = `${daemonPoint}/alive`;
const killUrl = `${daemonPoint}/kill`;
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
    await fs.rm(`${configPath}`);
  } catch (_) {
    return true;
  }

  try {
    const result = await urllib.request(`${delUrl}`, {
      method: 'POST',
      data: { projectPath: config.projectPath },
      dataType: 'json',
      contentType: 'json',
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
      dataType: 'json',
      contentType: 'json',
    });
    return result.status === 200;
  } catch (_) {
    return false;
  }
};

const runDeamon = async () => {
  const deamon = execa(destinationFilePath, [], {
    detached: true,
    stdio: [ 'ignore', 'pipe', 'pipe' ],
  });
  await new Promise((resolve, reject) => {
    let output = '';

    const expectedMain = 'deamon main is ready';

    const expectedServer = 'deamon server is ready';

    deamon.stdout.on('data', data => {
      output += data.toString();

      if (output.includes(expectedMain) && output.includes(expectedServer)) {
        resolve();
      }
    });

    deamon.catch(e => {
      reject(e);
    });
  });
};

const killDeamon = async () => {
  try {
    const result = await urllib.request(`${killUrl}`, {
      method: 'GET',
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

  try {
    await fs.stat(destinationFilePath);
    await runDeamon();
  } catch (e) {
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

    chmodSync(destinationFilePath, '777');

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
    } finally {
      await runDeamon();
    }
  }
};

exports.initDeamon = initDeamon;
exports.delProject = delProject;
exports.addProject = addProject;
exports.killDeamon = killDeamon;
