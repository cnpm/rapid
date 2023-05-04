'use strict';

const nock = require('nock');
const { FEATURES_MAP } = require('../../../../packages/tnpm/lib/features');

nock('https://renderoffice.alipay.com')
  .persist()
  .get('/p/yuyan/tnpmregistry_data_tnpm-features/zh_CN.json')
  .reply(200, [
    {
      featName: FEATURES_MAP.NPM_CI_FOR_LOCAL_INSTALL,
      featRepos: [],
      featForceRelease: false,
    },
    {
      featName: 'tnpm_feat_default_npm_mode',
      featRepos: [],
      featForceRelease: true,
    },
  ]);
