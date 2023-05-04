'use strict';

const util = require('node:util');
const mapWorkspaces = require('@npmcli/map-workspaces');
const fs = require('node:fs/promises');
const path = require('node:path');
const chalk = require('chalk');

class RemoteResolver {
  /**
   * @param {DepContext} ctx -
   * @param {Object} options -
   */
  constructor(ctx, options) {
    this.ctx = ctx;
    this.pkg = ctx.pkg;
    this.modifyDeps = ctx.modifyDeps;
    this.httpclient = options.httpclient;
  }

  async resolve() {
    console.time('[rapid] resolve deps tree');
    const workspaces = await this.getWorkspaces();
    const reqData = {
      project: this.pkg || {},
    };

    if (workspaces && Object.keys(workspaces).length > 0) {
      reqData.workspaces = workspaces;
    }

    if (this.modifyDeps) {
      reqData.modifyDeps = this.modifyDeps;
    }

    let res;
    if (this.ctx.lockId) {
      res = await this.updateTree(reqData);
    } else {
      res = await this.generateNewTree(reqData);
    }
    console.timeEnd('[rapid] resolve deps tree');

    if (res.status !== 200) {
      const traceId = res.headers['request-id'];
      throw new Error(chalk.red(`[rapid] ${res?.data?.error?.message}, traceId: ${traceId}, code: ${res.status}.`));
    }
    const depsResult = res && res.data || {};
    if (!depsResult.success || !depsResult.data || !depsResult.data.tree) {
      const msg = util.format('get tree failed %j', depsResult.error);
      throw new Error(msg);
    }
    const { tree, treeId, warning } = depsResult.data;
    console.info('[rapid] 生成依赖树成功 treeId：%s，在线地址：%s', treeId, `${this.ctx.npmcoreTreeURL}/${treeId}`);
    if (warning) {
      console.info('[rapid] warning: ', warning);
    }
    this.ctx.lockId = treeId;
    return tree;
  }

  async getWorkspaces() {
    const workspaces = {};
    if (this.pkg) {
      const mappedWorkspaces = await mapWorkspaces({
        cwd: this.ctx.cwd,
        pkg: this.pkg,
      });

      for (const dir of mappedWorkspaces.values()) {
        const pkgContent = await fs.readFile(path.join(dir, 'package.json'), 'utf8');
        const pkg = JSON.parse(pkgContent);
        const pkgDir = path.relative(this.ctx.cwd, dir);
        workspaces[pkgDir] = pkg;
      }
    }

    return workspaces;
  }

  async generateNewTree(reqData) {
    return await this.httpclient.request(this.ctx.npmcoreTreeURL, {
      method: 'POST',
      data: {
        ...reqData,
        // env: process.env,
        options: this.ctx.arboristOptions,
      },
      contentType: 'json',
      dataType: 'json',
      timeout: 120000,
    });
  }

  async updateTree(reqData) {
    return await this.httpclient.request(this.ctx.npmcoreTreeURL, {
      method: 'PUT',
      data: {
        ...reqData,
        // env: process.env,
        treeId: this.ctx.lockId,
        options: this.ctx.arboristOptions,
        update: this.ctx.update,
      },
      contentType: 'json',
      dataType: 'json',
      timeout: 120000,
    });
  }
}

module.exports = RemoteResolver;
