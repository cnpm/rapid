'use strict';

const urllib = require('urllib');

(async () => {
  const [
    // eslint-disable-next-line no-unused-vars
    _,
    // eslint-disable-next-line no-unused-vars
    __,
    volumeId,
    socketPath,
    mountId,
  ] = process.argv;
  const res = await urllib.request('http://unix/api/v1/mount', {
    method: 'DELETE',
    contentType: 'json',
    dataType: 'json',
    data: {
      volumeId,
      mountId,
      mode: 'local',
    },
    socketPath,
  });
  if (res.status !== 200) {
    throw new Error(`umount nydus failed, status code is ${res.status} ${JSON.stringify(res.data)}`);
  }
})();
