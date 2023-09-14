# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [0.2.3](https://github.com/cnpm/rapid/compare/v0.2.1...v0.2.3) (2023-09-14)

**Note:** Version bump only for package cnpm-rapid-monorepo





## [0.2.2](https://github.com/cnpm/rapid/compare/v0.2.1...v0.2.2) (2023-09-14)

**Note:** Version bump only for package cnpm-rapid-monorepo





# [0.2.0](https://github.com/cnpm/rapid/compare/v0.1.2...v0.2.0) (2023-07-25)


### Bug Fixes

* fix restore from toc map/index ([#27](https://github.com/cnpm/rapid/issues/27)) ([9cd6b8b](https://github.com/cnpm/rapid/commit/9cd6b8bff7d53ff0f010278086bea671570501ff))


### Features

* use zero copy to optimize restore performance ([#28](https://github.com/cnpm/rapid/issues/28)) ([d02f413](https://github.com/cnpm/rapid/commit/d02f41346e21830d2e390ad23e490cc989ff0ad6))





## [0.1.2](https://github.com/cnpm/rapid/compare/v0.1.1...v0.1.2) (2023-07-24)

**Note:** Version bump only for package cnpm-rapid-monorepo





## [0.1.1](https://github.com/cnpm/rapid/compare/v0.1.0...v0.1.1) (2023-07-24)

**Note:** Version bump only for package cnpm-rapid-monorepo





# 0.1.0 (2023-07-24)


### Bug Fixes

* **binding:** openssl deps ([83c33de](https://github.com/cnpm/rapid/commit/83c33deb6faddc50ea73f8fde54b14d23f56479f))
* **cli:** add dep tree resolver options ([157bb77](https://github.com/cnpm/rapid/commit/157bb777052a666a32a28f19211139a693e34c46))
* **cli:** add RemoteResolver and RemoteCacheResolver options ([0014266](https://github.com/cnpm/rapid/commit/00142667d954a9d7b44246e1442d0bf1d3519394))
* **cli:** package main entry ([b03c2ad](https://github.com/cnpm/rapid/commit/b03c2ad26a874b63226c8c9c64cfb8b500662a59))
* **cli:** read pkg file ([bf33622](https://github.com/cnpm/rapid/commit/bf33622ee90115b4ff595c44fb84f980eddddb6b))
* **cli:** readPkgJSON error ([6a1f4b6](https://github.com/cnpm/rapid/commit/6a1f4b6721f423df353f47a63710195dbdc17721))
* **cli:** remove runscript deps ([84eb651](https://github.com/cnpm/rapid/commit/84eb65152ff4d5dbe6f76168fd16cab55f6b9e64))
* **cli:** util func missing ([b76df41](https://github.com/cnpm/rapid/commit/b76df415053f1b83a9c135bde92108bec7c91afc))
* **deps:** update deps ([814244c](https://github.com/cnpm/rapid/commit/814244c1111fd8fdb744a3d705bf3826822546ec))
* local resolver should generate lockfile properly ([#24](https://github.com/cnpm/rapid/issues/24)) ([ee762af](https://github.com/cnpm/rapid/commit/ee762afd65b50b2ae7145b894656a4421b4a6dd0))
* parse tarball url error ([#18](https://github.com/cnpm/rapid/issues/18)) ([2e26387](https://github.com/cnpm/rapid/commit/2e26387e099c5f441a0e8d1bc63e725437a5c7a9))
* rapid umount erorr ([1a6c5fa](https://github.com/cnpm/rapid/commit/1a6c5fa69799b5ea0aec58a6f7183dfe40fac3ba))
* runProjectLifecycleScript OOM ([e451d73](https://github.com/cnpm/rapid/commit/e451d73d5050394a6f18f1ae255cdaac497554ea))
* should not download tgz when has no tarball link for an optionalDependency ([819d72b](https://github.com/cnpm/rapid/commit/819d72bf7b3125a8eea945aae6e50a85b183fd95))
* use execa instead of runscript ([#19](https://github.com/cnpm/rapid/issues/19)) ([3345f62](https://github.com/cnpm/rapid/commit/3345f62c65e308f5dbff8754d19a48b4485687d4))
* use runscript instead of execa.command ([3832536](https://github.com/cnpm/rapid/commit/3832536ffc9e278a9d8b8d81ab22f2fc9632f136))
* workspaces lifecycle scripts not running ([232e9b2](https://github.com/cnpm/rapid/commit/232e9b26899f11b29d730452cb686c89c258185c))


### Features

* impl restore buckets and toc_index_store ([#4](https://github.com/cnpm/rapid/issues/4)) ([4975b58](https://github.com/cnpm/rapid/commit/4975b58bd9191eaccbfc4b0dd8f7601d05a682f5))
* init rapid ([0f3c7f6](https://github.com/cnpm/rapid/commit/0f3c7f6f80efc7c44ace662895477ff67a2b3eec))
* use fuse-t ([#26](https://github.com/cnpm/rapid/issues/26)) ([693402d](https://github.com/cnpm/rapid/commit/693402d337651215502034c1b65d594737019408))







**Note:** Version bump only for package cnpm-rapid-monorepo





## 0.0.13 (2023-07-11)


### Bug Fixes

* **binding:** openssl deps ([83c33de](https://github.com/cnpm/rapid/commit/83c33deb6faddc50ea73f8fde54b14d23f56479f))
* **cli:** add dep tree resolver options ([157bb77](https://github.com/cnpm/rapid/commit/157bb777052a666a32a28f19211139a693e34c46))
* **cli:** add RemoteResolver and RemoteCacheResolver options ([0014266](https://github.com/cnpm/rapid/commit/00142667d954a9d7b44246e1442d0bf1d3519394))
* **cli:** package main entry ([b03c2ad](https://github.com/cnpm/rapid/commit/b03c2ad26a874b63226c8c9c64cfb8b500662a59))
* **cli:** read pkg file ([bf33622](https://github.com/cnpm/rapid/commit/bf33622ee90115b4ff595c44fb84f980eddddb6b))
* **cli:** readPkgJSON error ([6a1f4b6](https://github.com/cnpm/rapid/commit/6a1f4b6721f423df353f47a63710195dbdc17721))
* **cli:** remove runscript deps ([84eb651](https://github.com/cnpm/rapid/commit/84eb65152ff4d5dbe6f76168fd16cab55f6b9e64))
* **cli:** util func missing ([b76df41](https://github.com/cnpm/rapid/commit/b76df415053f1b83a9c135bde92108bec7c91afc))
* **deps:** update deps ([814244c](https://github.com/cnpm/rapid/commit/814244c1111fd8fdb744a3d705bf3826822546ec))
* parse tarball url error ([#18](https://github.com/cnpm/rapid/issues/18)) ([2e26387](https://github.com/cnpm/rapid/commit/2e26387e099c5f441a0e8d1bc63e725437a5c7a9))
* rapid umount erorr ([1a6c5fa](https://github.com/cnpm/rapid/commit/1a6c5fa69799b5ea0aec58a6f7183dfe40fac3ba))
* runProjectLifecycleScript OOM ([e451d73](https://github.com/cnpm/rapid/commit/e451d73d5050394a6f18f1ae255cdaac497554ea))
* should not download tgz when has no tarball link for an optionalDependency ([819d72b](https://github.com/cnpm/rapid/commit/819d72bf7b3125a8eea945aae6e50a85b183fd95))
* use execa instead of runscript ([#19](https://github.com/cnpm/rapid/issues/19)) ([3345f62](https://github.com/cnpm/rapid/commit/3345f62c65e308f5dbff8754d19a48b4485687d4))
* use runscript instead of execa.command ([3832536](https://github.com/cnpm/rapid/commit/3832536ffc9e278a9d8b8d81ab22f2fc9632f136))
* workspaces lifecycle scripts not running ([232e9b2](https://github.com/cnpm/rapid/commit/232e9b26899f11b29d730452cb686c89c258185c))


### Features

* impl restore buckets and toc_index_store ([#4](https://github.com/cnpm/rapid/issues/4)) ([4975b58](https://github.com/cnpm/rapid/commit/4975b58bd9191eaccbfc4b0dd8f7601d05a682f5))
* init rapid ([0f3c7f6](https://github.com/cnpm/rapid/commit/0f3c7f6f80efc7c44ace662895477ff67a2b3eec))





## 0.0.12 (2023-07-06)


### Bug Fixes

* **binding:** openssl deps ([83c33de](https://github.com/cnpm/rapid/commit/83c33deb6faddc50ea73f8fde54b14d23f56479f))
* **cli:** add dep tree resolver options ([157bb77](https://github.com/cnpm/rapid/commit/157bb777052a666a32a28f19211139a693e34c46))
* **cli:** add RemoteResolver and RemoteCacheResolver options ([0014266](https://github.com/cnpm/rapid/commit/00142667d954a9d7b44246e1442d0bf1d3519394))
* **cli:** package main entry ([b03c2ad](https://github.com/cnpm/rapid/commit/b03c2ad26a874b63226c8c9c64cfb8b500662a59))
* **cli:** read pkg file ([bf33622](https://github.com/cnpm/rapid/commit/bf33622ee90115b4ff595c44fb84f980eddddb6b))
* **cli:** readPkgJSON error ([6a1f4b6](https://github.com/cnpm/rapid/commit/6a1f4b6721f423df353f47a63710195dbdc17721))
* **cli:** remove runscript deps ([84eb651](https://github.com/cnpm/rapid/commit/84eb65152ff4d5dbe6f76168fd16cab55f6b9e64))
* **cli:** util func missing ([b76df41](https://github.com/cnpm/rapid/commit/b76df415053f1b83a9c135bde92108bec7c91afc))
* **deps:** update deps ([814244c](https://github.com/cnpm/rapid/commit/814244c1111fd8fdb744a3d705bf3826822546ec))
* parse tarball url error ([#18](https://github.com/cnpm/rapid/issues/18)) ([2e26387](https://github.com/cnpm/rapid/commit/2e26387e099c5f441a0e8d1bc63e725437a5c7a9))
* rapid umount erorr ([1a6c5fa](https://github.com/cnpm/rapid/commit/1a6c5fa69799b5ea0aec58a6f7183dfe40fac3ba))
* runProjectLifecycleScript OOM ([e451d73](https://github.com/cnpm/rapid/commit/e451d73d5050394a6f18f1ae255cdaac497554ea))
* should not download tgz when has no tarball link for an optionalDependency ([819d72b](https://github.com/cnpm/rapid/commit/819d72bf7b3125a8eea945aae6e50a85b183fd95))
* use execa instead of runscript ([#19](https://github.com/cnpm/rapid/issues/19)) ([3345f62](https://github.com/cnpm/rapid/commit/3345f62c65e308f5dbff8754d19a48b4485687d4))
* use runscript instead of execa.command ([3832536](https://github.com/cnpm/rapid/commit/3832536ffc9e278a9d8b8d81ab22f2fc9632f136))
* workspaces lifecycle scripts not running ([232e9b2](https://github.com/cnpm/rapid/commit/232e9b26899f11b29d730452cb686c89c258185c))


### Features

* impl restore buckets and toc_index_store ([#4](https://github.com/cnpm/rapid/issues/4)) ([4975b58](https://github.com/cnpm/rapid/commit/4975b58bd9191eaccbfc4b0dd8f7601d05a682f5))
* init rapid ([0f3c7f6](https://github.com/cnpm/rapid/commit/0f3c7f6f80efc7c44ace662895477ff67a2b3eec))





## 0.0.11 (2023-05-24)


### Bug Fixes

* **binding:** openssl deps ([83c33de](https://github.com/cnpm/rapid/commit/83c33deb6faddc50ea73f8fde54b14d23f56479f))
* **cli:** add dep tree resolver options ([157bb77](https://github.com/cnpm/rapid/commit/157bb777052a666a32a28f19211139a693e34c46))
* **cli:** add RemoteResolver and RemoteCacheResolver options ([0014266](https://github.com/cnpm/rapid/commit/00142667d954a9d7b44246e1442d0bf1d3519394))
* **cli:** package main entry ([b03c2ad](https://github.com/cnpm/rapid/commit/b03c2ad26a874b63226c8c9c64cfb8b500662a59))
* **cli:** read pkg file ([bf33622](https://github.com/cnpm/rapid/commit/bf33622ee90115b4ff595c44fb84f980eddddb6b))
* **cli:** readPkgJSON error ([6a1f4b6](https://github.com/cnpm/rapid/commit/6a1f4b6721f423df353f47a63710195dbdc17721))
* **cli:** remove runscript deps ([84eb651](https://github.com/cnpm/rapid/commit/84eb65152ff4d5dbe6f76168fd16cab55f6b9e64))
* **cli:** util func missing ([b76df41](https://github.com/cnpm/rapid/commit/b76df415053f1b83a9c135bde92108bec7c91afc))
* **deps:** update deps ([814244c](https://github.com/cnpm/rapid/commit/814244c1111fd8fdb744a3d705bf3826822546ec))
* rapid umount erorr ([1a6c5fa](https://github.com/cnpm/rapid/commit/1a6c5fa69799b5ea0aec58a6f7183dfe40fac3ba))
* runProjectLifecycleScript OOM ([e451d73](https://github.com/cnpm/rapid/commit/e451d73d5050394a6f18f1ae255cdaac497554ea))
* should not download tgz when has no tarball link for an optionalDependency ([819d72b](https://github.com/cnpm/rapid/commit/819d72bf7b3125a8eea945aae6e50a85b183fd95))
* use runscript instead of execa.command ([3832536](https://github.com/cnpm/rapid/commit/3832536ffc9e278a9d8b8d81ab22f2fc9632f136))
* workspaces lifecycle scripts not running ([232e9b2](https://github.com/cnpm/rapid/commit/232e9b26899f11b29d730452cb686c89c258185c))


### Features

* impl restore buckets and toc_index_store ([#4](https://github.com/cnpm/rapid/issues/4)) ([4975b58](https://github.com/cnpm/rapid/commit/4975b58bd9191eaccbfc4b0dd8f7601d05a682f5))
* init rapid ([0f3c7f6](https://github.com/cnpm/rapid/commit/0f3c7f6f80efc7c44ace662895477ff67a2b3eec))





## 0.0.10 (2023-05-24)


### Bug Fixes

* **binding:** openssl deps ([83c33de](https://github.com/cnpm/rapid/commit/83c33deb6faddc50ea73f8fde54b14d23f56479f))
* **cli:** add dep tree resolver options ([157bb77](https://github.com/cnpm/rapid/commit/157bb777052a666a32a28f19211139a693e34c46))
* **cli:** add RemoteResolver and RemoteCacheResolver options ([0014266](https://github.com/cnpm/rapid/commit/00142667d954a9d7b44246e1442d0bf1d3519394))
* **cli:** package main entry ([b03c2ad](https://github.com/cnpm/rapid/commit/b03c2ad26a874b63226c8c9c64cfb8b500662a59))
* **cli:** read pkg file ([bf33622](https://github.com/cnpm/rapid/commit/bf33622ee90115b4ff595c44fb84f980eddddb6b))
* **cli:** readPkgJSON error ([6a1f4b6](https://github.com/cnpm/rapid/commit/6a1f4b6721f423df353f47a63710195dbdc17721))
* **cli:** remove runscript deps ([84eb651](https://github.com/cnpm/rapid/commit/84eb65152ff4d5dbe6f76168fd16cab55f6b9e64))
* **cli:** util func missing ([b76df41](https://github.com/cnpm/rapid/commit/b76df415053f1b83a9c135bde92108bec7c91afc))
* **deps:** update deps ([814244c](https://github.com/cnpm/rapid/commit/814244c1111fd8fdb744a3d705bf3826822546ec))
* rapid umount erorr ([1a6c5fa](https://github.com/cnpm/rapid/commit/1a6c5fa69799b5ea0aec58a6f7183dfe40fac3ba))
* runProjectLifecycleScript OOM ([e451d73](https://github.com/cnpm/rapid/commit/e451d73d5050394a6f18f1ae255cdaac497554ea))
* should not download tgz when has no tarball link for an optionalDependency ([819d72b](https://github.com/cnpm/rapid/commit/819d72bf7b3125a8eea945aae6e50a85b183fd95))
* use runscript instead of execa.command ([3832536](https://github.com/cnpm/rapid/commit/3832536ffc9e278a9d8b8d81ab22f2fc9632f136))
* workspaces lifecycle scripts not running ([232e9b2](https://github.com/cnpm/rapid/commit/232e9b26899f11b29d730452cb686c89c258185c))


### Features

* impl restore buckets and toc_index_store ([#4](https://github.com/cnpm/rapid/issues/4)) ([4975b58](https://github.com/cnpm/rapid/commit/4975b58bd9191eaccbfc4b0dd8f7601d05a682f5))
* init rapid ([0f3c7f6](https://github.com/cnpm/rapid/commit/0f3c7f6f80efc7c44ace662895477ff67a2b3eec))





## 0.0.9 (2023-05-24)


### Bug Fixes

* **binding:** openssl deps ([83c33de](https://github.com/cnpm/rapid/commit/83c33deb6faddc50ea73f8fde54b14d23f56479f))
* **cli:** add dep tree resolver options ([157bb77](https://github.com/cnpm/rapid/commit/157bb777052a666a32a28f19211139a693e34c46))
* **cli:** add RemoteResolver and RemoteCacheResolver options ([0014266](https://github.com/cnpm/rapid/commit/00142667d954a9d7b44246e1442d0bf1d3519394))
* **cli:** package main entry ([b03c2ad](https://github.com/cnpm/rapid/commit/b03c2ad26a874b63226c8c9c64cfb8b500662a59))
* **cli:** read pkg file ([bf33622](https://github.com/cnpm/rapid/commit/bf33622ee90115b4ff595c44fb84f980eddddb6b))
* **cli:** readPkgJSON error ([6a1f4b6](https://github.com/cnpm/rapid/commit/6a1f4b6721f423df353f47a63710195dbdc17721))
* **cli:** remove runscript deps ([84eb651](https://github.com/cnpm/rapid/commit/84eb65152ff4d5dbe6f76168fd16cab55f6b9e64))
* **cli:** util func missing ([b76df41](https://github.com/cnpm/rapid/commit/b76df415053f1b83a9c135bde92108bec7c91afc))
* **deps:** update deps ([814244c](https://github.com/cnpm/rapid/commit/814244c1111fd8fdb744a3d705bf3826822546ec))
* rapid umount erorr ([1a6c5fa](https://github.com/cnpm/rapid/commit/1a6c5fa69799b5ea0aec58a6f7183dfe40fac3ba))
* runProjectLifecycleScript OOM ([e451d73](https://github.com/cnpm/rapid/commit/e451d73d5050394a6f18f1ae255cdaac497554ea))
* should not download tgz when has no tarball link for an optionalDependency ([819d72b](https://github.com/cnpm/rapid/commit/819d72bf7b3125a8eea945aae6e50a85b183fd95))
* use runscript instead of execa.command ([3832536](https://github.com/cnpm/rapid/commit/3832536ffc9e278a9d8b8d81ab22f2fc9632f136))
* workspaces lifecycle scripts not running ([232e9b2](https://github.com/cnpm/rapid/commit/232e9b26899f11b29d730452cb686c89c258185c))


### Features

* impl restore buckets and toc_index_store ([#4](https://github.com/cnpm/rapid/issues/4)) ([4975b58](https://github.com/cnpm/rapid/commit/4975b58bd9191eaccbfc4b0dd8f7601d05a682f5))
* init rapid ([0f3c7f6](https://github.com/cnpm/rapid/commit/0f3c7f6f80efc7c44ace662895477ff67a2b3eec))
