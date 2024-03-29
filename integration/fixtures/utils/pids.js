'use strict';
const execa = require('execa');

class Pids {
  constructor(nodeModulesDir) {
    this.nodeModulesDir = nodeModulesDir;
  }

  async getPsSnapshot() {
    try {
      const { stdout } = await execa.command('ps aux');
      return stdout;
    } catch (error) {
      throw new Error(`Failed to execute 'ps aux': ${error.message}`, { cause: error });
    }
  }

  async getPids() {
    const pids = [];

    try {
      const snapshot = await this.getPsSnapshot();
      console.log(snapshot);
      if (process.platform === 'darwin') {
        const overlayPattern = new RegExp(`unionfs.*?${this.nodeModulesDir}`, 'i');
        const nfsPattern = new RegExp(
          `/usr/local/bin/go-nfsv4.*?${this.nodeModulesDir}`, 'i'
        );
        for (const line of snapshot.split('\n')) {
          if (overlayPattern.test(line)) {
            const fields = line.split(/\s+/);
            console.log(fields);
            if (fields.length >= 11) {
              const pid = parseInt(fields[1], 10) || 0;
              pids.push(pid);
            }
          }

          if (nfsPattern.test(line)) {
            const fields = line.split(/\s+/);
            console.log(fields);
            if (fields.length >= 11) {
              const pid = parseInt(fields[1], 10) || 0;
              pids.push(pid);
            }
          }
        }
      }

      return pids;
    } catch (error) {
      throw new Error(`Failed to get PIDs: ${error.message}`, { cause: error });
    }
  }
}

exports.Pids = Pids;
