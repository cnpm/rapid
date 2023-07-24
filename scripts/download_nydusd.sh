#!/bin/bash

set -eux

# https://github.com/dragonflyoss/image-service/releases/download/v2.1.6/nydus-static-v2.1.6-darwin-amd64.tgz

NYDUS_VERSION=v2.0.0-cnpm.2
os="${BUILD_OS:-darwin}"
arch="${BUILD_ARCH:-amd64}"

UNION_FS_VERSION=v1.0.1

if [[ "${os}" == "macos" ]]; then
  os="darwin"
fi

echo "os: ${os}"
echo "arch: ${arch}"
echo "version: ${NYDUS_VERSION}"

download_nydusd() {
  version=$1
  os=$2
  arch=$3
  wget "https://github.com/cnpm/image-service/releases/download/${version}/nydus-static-${version}-${os}-${arch}.tgz" -O nydus.tgz
  tar -xzf nydus.tgz -C $(pwd)/bindings/binding-${os}-${arch} --strip-components 1  nydus-static/nydusd
  rm nydus.tgz
}

download_union_fs() {
    version=$1
    os=$2
    arch=$3
    if [[ "${os}" == "darwin" ]]; then
      wget "https://github.com/cnpm/unionfs-fuse/releases/download/${version}/unionfs-refs-tags-${version}-${os}-${arch}.tgz" -O unionfs.tgz
      tar -xzf unionfs.tgz -C $(pwd)/bindings/binding-${os}-${arch} --strip-components 1  unionfs/unionfs
      rm unionfs.tgz
    fi
}

download_nydusd ${NYDUS_VERSION} ${os} ${arch}
download_union_fs ${UNION_FS_VERSION} ${os} ${arch}
