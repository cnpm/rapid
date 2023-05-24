# Quick Start

## Prerequisites
- nginx: Use nginx to host tar files and provide downloads for use cases.
- npm: Please use 9.x npm.

## Build

```shell

# Install dependencies

npm i

# Environment preparation, rust build and use case download

npm run build

```

## Node Unit Test

You can add test cases under `packages/cli/test`, and we will use mocha to test the cases.

```shell

# Run linting and unit tests

npm run test

# Only run unit tests

npm run test-only

```

## Node Integration Test

You can add test cases under `integration`, and we will use mocha to test the cases.

```shell

npm run test:integration

```

## Rust Unit Test

```shell

npm run test:rust

```

## Release

### Create a release branch

```shell

git checkout -b 'release/${version}'

npm run version

git push -u origin 'release/${version}'

```

### Create PR

Create a PR to master branch, wait for CI testing pass.

### Trigger release

``` shell

git push origin ${version}

```
