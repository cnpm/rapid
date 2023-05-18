'use strict';

const path = require('node:path');
const fs = require('node:fs/promises');
const chalk = require('chalk');
const ms = require('ms');
const mapWorkspaces = require('@npmcli/map-workspaces');
const os = require('node:os');
const {
  getDisplayName,
  runScript,
  readPkgJSON,
} = require('./util');

// scripts that should run in cwd package and linked package
const DEFAULT_ROOT_SCRIPTS = [
  'preinstall',
  'install',
  'postinstall',
  'prepublish',
  'preprepare',
  'prepare',
  'postprepare',
];

// scripts that should run in dependencies
const DEFAULT_DEP_SCRIPTS = [
  'preinstall',
  'install',
  'postinstall',
];

exports.Scripts = class Scripts {
  constructor(options) {
    this.options = options;

    this.installTasks = [];
  }

  // 对于单个依赖而言，lifecycle scripts 需要按照 preinstall,install,postinstall 顺序执行
  // 单个依赖需要等子依赖安装好才能再执行 lifecycle scripts
  // 项目的 lifecycle scripts 需要在所有依赖安装好之后再执行，且顺序为 preinstall,install,postinstall,prepublish,preprepare,prepare,postprepare
  storeLifecycleScripts(pkg, packageStorePath, optional, hasGyp) {
    const scripts = pkg.scripts || {};
    const displayName = getDisplayName(pkg);

    if (!scripts.install && hasGyp) {
      scripts.install = 'node-gyp rebuild';
    }

    const hasInstallScript = Object.keys(scripts).some(script => DEFAULT_DEP_SCRIPTS.includes(script));
    if (hasInstallScript) {
      this.installTasks.push({
        pkg: Object.assign({}, pkg, { scripts }),
        cwd: packageStorePath,
        optional: !!optional,
        displayName,
      });
    }
  }

  // binary-mirror-config 需要在 postinstall/install 的时候执行，因为这时候才会将文件写到 upperdir
  async runLifecycleScripts(mirrorConfig) {
    let count = 0;
    const total = this.installTasks?.length;
    if (total && this.options.ignoreScripts) {
      console.warn(chalk.yellow('[rapid] ignore all lifecycle scripts'));
      return;
    }

    if (total) {
      console.log(chalk.yellow(`[rapid] execute ${total} lifecycle script(s).`));
    }

    for (const task of this.installTasks) {
      count++;
      const pkg = task.pkg;
      const scripts = pkg.scripts;
      const cwd = path.join(this.options.cwd, task.cwd);
      const displayName = task.displayName;
      for (const script of DEFAULT_DEP_SCRIPTS) {
        const lifecycleScript = scripts?.[script];
        if (!lifecycleScript) {
          continue;
        }
        // ref: https://docs.npmjs.com/cli/v7/using-npm/scripts#npm-install
        // npm registry 会在模块根目录有 binding.gyp 且无 preinstall 和 install 的时候
        // 设置 scripts.install 为 `node-gyp rebuild`
        // 可以参照 fsevents@2.3.2 模块
        //   npm registry 的输出：https://registry.npmjs.com/fsevents/2.3.2
        //   源码：https://github.com/fsevents/fsevents/blob/master/package.json#L18
        // 所以这里需要处理一下这个问题的逆否情况，即
        // 如果不存在 binding.gyp 且 scripts.install 为`node-gyp install` 时跳过脚本执行
        if (script === 'install') {
          const defaultCmd = 'node-gyp rebuild';
          try {
            await fs.stat(path.join(cwd, 'binding.gyp'));
          } catch (_) {
            if (lifecycleScript === defaultCmd) {
              console.warn(
                '%s %s skip running %s, cwd: %s',
                chalk.yellow(`[${count}/${total}] scripts.install`),
                chalk.gray(displayName),
                lifecycleScript,
                cwd
              );
              continue;
            }
          }
        }
        console.warn(
          '%s%s %s run %s, cwd: %s',
          chalk.yellow(`[${count}/${total}] scripts.`),
          script,
          chalk.gray(displayName),
          scripts[script],
          cwd
        );
        const start = Date.now();
        try {
          await mirrorConfig.updatePkg(cwd, pkg);
          await runScript(cwd, lifecycleScript, this.options);
        } catch (err) {
          console.warn('[rapid:runscript:error] %s scripts.%s run %s error: %j',
            chalk.red(displayName), script, lifecycleScript, err);

          if (task.optional) {
            console.warn(chalk.red('%s optional error: %s'), displayName, err.stack);
            continue;
          }
          err.message = `${script} error, please remove node_modules before retry!${os.EOL}${err.message}`;
          throw err;
        } finally {
          console.warn(
            '%s%s %s finished in %s',
            chalk.yellow(`[${count}/${total}] scripts.`),
            script,
            chalk.gray(displayName),
            ms(Date.now() - start)
          );
        }
      }
    }

    await this.runProjectLifecycleScripts();
    this.options.spinner?.succeed(`Run ${total} scripts`);
  }

  async runProjectLifecycleScripts() {
    const {
      cwd,
      pkg,
    } = this.options;

    const workspaces = await mapWorkspaces({
      cwd,
      pkg,
    });

    // workspaces
    for (const p of workspaces.values()) {
      const subpkg = path.isAbsolute(p) ? p : path.join(cwd, p);
      const { pkg } = await readPkgJSON(subpkg);
      await this.runProjectLifecycleScript(subpkg, pkg);
    }

    // root project
    await this.runProjectLifecycleScript(cwd, pkg);
  }

  async runProjectLifecycleScript(cwd, pkg) {
    const scripts = pkg.scripts;
    for (const script of DEFAULT_ROOT_SCRIPTS) {
      const lifecycleScript = scripts?.[script];
      if (!lifecycleScript) {
        continue;
      }
      console.warn(
        '[rapid] %s%s %s %s, cwd: %s',
        chalk.yellow('scripts.'),
        script,
        chalk.gray(`${pkg.name}@${pkg.version}`),
        lifecycleScript,
        cwd
      );
      await runScript(cwd, lifecycleScript, this.options);
    }
  }
};
