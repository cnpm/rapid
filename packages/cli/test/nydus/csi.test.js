'use strict';

const http = require('http');
const mm = require('mm');
const path = require('node:path');
const crypto = require('crypto');
const fs = require('node:fs/promises');
const util = require('node:util');
const assert = require('node:assert');
const runscript = require('runscript');
const constants = require('../../lib/constants');
const { NYDUS_CSI_SOCKET_ENV, NYDUS_CSI_ROOT_ENV } = require('../../lib/constants');
const csiMode = require('../../lib/nydusd/csi_mode');
const { wrapSudo, getWorkdir } = require('../../lib/util');
const os = require('node:os');

describe('test/nydus/csi.test.js', () => {
  if (os.platform() === 'darwin') return;
  const tmpDir = path.join(__dirname, '../fixtures/tmp');

  const socketPath = path.join(tmpDir, '/nydus.sock');
  const blobRoot = path.join(tmpDir, '/nydus_blob');
  const mntRoot = path.join(tmpDir, '/nydus_mnt');
  const tarBucketsDir = path.join(tmpDir, '/tar_buckets');
  const mountId = crypto.randomUUID();
  const mountDir = path.join(mntRoot, mountId);
  const testFileName = 'package.json';
  const testFile = path.join(mountDir, testFileName);
  const cwd = path.join(tmpDir, crypto.randomUUID());
  const mockNydusBootstrap = path.join(__dirname, '../fixtures/bin/nydus-bootstrap.js');
  let server;

  beforeEach(() => {
    mm(process.env, NYDUS_CSI_SOCKET_ENV, socketPath);
    mm(process.env, NYDUS_CSI_ROOT_ENV, mntRoot);
    mm(constants, 'tarBucketsDir', tarBucketsDir);
    mm(constants, 'NYDUS_CSI_BLOB_ROOT', blobRoot);
    mm(constants, 'BOOTSTRAP_BIN', mockNydusBootstrap);
  });

  before(async () => {
    await Promise.all([
      await fs.mkdir(blobRoot, { recursive: true }),
      await fs.mkdir(mountDir, { recursive: true }),
      await fs.mkdir(cwd, { recursive: true }),
      await fs.mkdir(tarBucketsDir, { recursive: true }),
    ]);
    await fs.writeFile(testFile, JSON.stringify({
      name: 'mock_pkg',
    }));
    await fs.writeFile(path.join(tarBucketsDir, 'bucket_1.tgz'), 'mock_blob');

    const { tarIndex, baseDir } = await getWorkdir(cwd);
    await fs.mkdir(baseDir, { recursive: true });

    await fs.writeFile(tarIndex, JSON.stringify({
      name: 'tar.index.json',
    }));

    server = http.createServer((req, res) => {
      const router = `${req.method}|${req.url}`;
      switch (router) {
        case 'POST|/api/v1/mount': {
          const body = JSON.stringify({
            data: {
              mountId,
            },
          });
          res.writeHead(200, {
            'Content-Type': 'application/json',
            'content-length': body.length,
          });
          res.end(body);
          return;
        }
        case 'DELETE|/api/v1/mount': {
          const body = JSON.stringify({
            data: {
              mountId,
            },
          });
          res.writeHead(200, {
            'Content-Type': 'application/json',
            'content-length': body.length,
          });
          res.end(body);
          return;
        }
        default: {
          const body = JSON.stringify({
            msg: 'no match router',
          });
          res.writeHead(500, {
            'Content-Type': 'application/json',
            'content-length': body.length,
          });
          res.end(body);
        }
      }

    });
    await Reflect.apply(
      util.promisify(server.listen),
      server,
      [socketPath]
    );
  });

  after(async () => {
    await fs.unlink(socketPath);
    server.close();

    await Promise.all([
      await fs.rm(socketPath, { recursive: true, force: true }),
      await fs.rm(blobRoot, { recursive: true, force: true }),
      await fs.rm(mountDir, { recursive: true, force: true }),
      await fs.rm(cwd, { recursive: true, force: true }),
    ]);
  });

  afterEach(() => {
    mm.restore();
  });

  describe('start nydus fs', () => {
    beforeEach(async () => {
      await fs.writeFile(path.join(cwd, 'package.json'), JSON.stringify({}));
    });

    afterEach(async () => {
      await runscript(wrapSudo(`umount ${path.join(cwd, 'node_modules')}`));
      const { overlay } = await getWorkdir(cwd);
      await runscript(wrapSudo(`umount ${overlay}`));
    });

    it('should work', async () => {
      await csiMode.startNydusFs(cwd, {});
      const dynamicTestFilePath = path.join(cwd, 'node_modules', testFileName);
      const content = await fs.readFile(dynamicTestFilePath, 'utf8');
      assert.deepStrictEqual(JSON.parse(content), {
        name: 'mock_pkg',
      });
      const { bootstrap: bootstrapFile } = await getWorkdir(cwd, '', constants.NYDUS_CSI_BLOB_ROOT);
      const bootstrap = await fs.readFile(bootstrapFile, 'utf8');
      assert(bootstrap === 'mock_bootstrap');
    });
  });

  describe('end nydus fs', () => {
    beforeEach(async () => {
      const { csiMountId } = await getWorkdir(cwd);
      await fs.writeFile(csiMountId, 'mock_mount_id');
    });

    it('should work', async () => {
      await csiMode.endNydusFs(cwd, {});
    });
  });

});
