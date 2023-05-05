'use strict';

const pacote = require('pacote');
const urllib = require('urllib');
const npa = require('npm-package-arg');
const debug = require('debug')('resolver');

const REAL_MANIFEST = Symbol.for('pacote.manifest');
const PACKAGE_SERVICE = Symbol.for('pacote.packageService');

class PackageService {
  constructor(options) {
    this.cache = {};
    this.options = options;
    this.hijack();
  }

  async manifest(spec, options) {
    const cacheObj = this.cache;
    const realSpec = spec.subSpec || spec;
    const name = realSpec.name;
    const fetchSpec = realSpec.fetchSpec;
    const cacheKey = `${name}@${fetchSpec}`;
    debug(`正在解析 ${cacheKey}`);
    if (cacheObj[cacheKey]) {
      debug(`命中缓存 ${cacheKey}`);
      return cacheObj[cacheKey];
    }
    try {
      cacheObj[cacheKey] = await (async () => {
        const res = await urllib.request(
          `https://registry.npmjs.org/${name}/${fetchSpec}`,
          {
            headers: {
              accept: 'application/vnd.npm.install-v1+json',
            },
            dataType: 'json',
            timeout: 1000 * 60,
            timing: true,
            retry: 3,
          }
        );
        const obj = res.data;
        if (!obj?.dist) {
          debug(`${cacheKey} 安装失败: %j`, obj);
        }
        obj._resolved = obj.dist.tarball;
        obj._integrity =
          obj.dist.integrity ||
          `sha1-${Buffer.from(obj.dist.shasum, 'hex').toString('base64')}`;
        obj._from = `${spec.name}@${spec.fetchSpec}`;
        obj._id = `${spec.name}@${obj.version}`;
        const deps = {
          ...obj.peerDependencies,
          ...obj.optionalDependencies,
          ...obj.dependencies,
        };
        for (const [ name, spec ] of Object.entries(deps)) {
          const request = npa(`${name}@${spec}`);
          if ([ 'alias', 'version', 'tag', 'range' ].includes(request.type)) {
            const opts = {
              ...options,
              isPreFetch: true,
            };
            pacote.manifest(request, opts);
          }
        }
        return obj;
      })();
    } catch (e) {
      debug('安装失败', cacheKey, e);
    }

    debug(`解析完成 ${cacheKey} ${cacheObj?.[cacheKey]?.version}`);
    return cacheObj[cacheKey];
  }

  async preload(manifest, isRoot, options) {
    try {
      const dependencies = {
        ...manifest.dependencies,
        ...(isRoot ? manifest.devDependencies : {}),
        ...(isRoot ? manifest.devDependencies : {}),
        ...manifest.peerDependencies,
        ...manifest.optionalDependencies,
      };
      await Promise.all(
        Object.entries(dependencies).map(([ name, spec ]) => {
          debug(`preload ${name}@${spec}}`);
          const res = this.manifest(npa(`${name}@${spec}`), options);
          debug(`${name}@${spec} done`);
          return res;
        })
      );
    } catch (e) {
      debug('preload failed', e);
    }
  }

  hijack() {
    if (!pacote[REAL_MANIFEST]) {
      pacote[REAL_MANIFEST] = pacote.manifest;
    }
    this.realManifeat = pacote[REAL_MANIFEST];
    pacote[PACKAGE_SERVICE] = this;
    pacote.manifest = this.manifest.bind(this);
  }
}

module.exports = PackageService;
