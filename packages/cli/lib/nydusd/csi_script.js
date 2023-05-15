'use strict';

const urllib = require('urllib');
const fs = require('node:fs/promises');

(async () => {
  const [
    // eslint-disable-next-line no-unused-vars
    _,
    // eslint-disable-next-line no-unused-vars
    __,
    metadata,
    volumeId,
    socketPath,
    csiMountId,
  ] = process.argv;
  const res = await urllib.request('http://unix/api/v1/mount', {
    method: 'POST',
    contentType: 'json',
    dataType: 'json',
    data: {
      volumeId,
      mode: 'local',
      metadata,
    },
    socketPath,
  });
  if (res.status !== 200) {
    throw new Error(`mount nydus failed, status code is ${res.status} ${JSON.stringify(res.data)}`);
  }
  const { data: { mountId } } = res.data;
  await fs.writeFile(csiMountId, mountId, {
    encoding: 'utf-8',
    // root 写入，避免权限问题
    mode: 0o644,
  });
})();
