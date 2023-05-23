#!/bin/bash

set -eux

# https://github.com/dragonflyoss/image-service/releases/download/v2.1.6/nydus-static-v2.1.6-darwin-amd64.tgz

NYDUS_VERSION=v2.1.6
os="${BUILD_OS:-darwin}"
arch="${BUILD_ARCH:-amd64}"

echo "os: ${os}"
echo "arch: ${arch}"
echo "version: ${NYDUS_VERSION}"

download_nydusd() {
  version=$1
  os=$2
  arch=$3
  wget "https://github.com/dragonflyoss/image-service/releases/download/${version}/nydus-static-${version}-${os}-${arch}.tgz" -O nydus.tgz
  tar -xzf nydus.tgz -C $(pwd)/bindings/binding-${os}-${arch} --strip-components 1  nydus-static/nydusd
  rm nydus.tgz
}

download_nydusd ${NYDUS_VERSION} ${os} ${arch}
