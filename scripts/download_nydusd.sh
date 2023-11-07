#!/bin/bash

set -eux

# Define versions
NYDUS_VERSION=v2.0.0-cnpm.3
os="${BUILD_OS:-darwin}"
arch="${BUILD_ARCH:-$(uname -m)}"

UNION_FS_VERSION=v1.0.1

# Normalize OS name
if [[ "${os}" == "macos" ]]; then
  os="darwin"
fi

echo "os: ${os}"
echo "arch: ${arch}"
echo "version: ${NYDUS_VERSION}"

# Function to check for wget or curl
download() {
  url=$1
  dest=$2

  if command -v wget > /dev/null; then
    wget "${url}" -O "${dest}"
  elif command -v curl > /dev/null; then
    curl -L "${url}" -o "${dest}"
  else
    echo "Error: wget or curl is required" >&2
    exit 1
  fi
}

# Function to download and extract nydusd
download_nydusd() {
  version=$1
  os=$2
  arch=$3
  download "https://github.com/cnpm/image-service/releases/download/${version}/nydus-static-${version}-${os}-${arch}.tgz" nydus.tgz
  tar -xzf nydus.tgz -C "$(pwd)/bindings/binding-${os}-${arch}" --strip-components 1 nydus-static/nydusd
  rm nydus.tgz
}

# Function to download and extract unionfs
download_union_fs() {
  version=$1
  os=$2
  arch=$3
  if [[ "${os}" == "darwin" ]]; then
    download "https://github.com/cnpm/unionfs-fuse/releases/download/${version}/unionfs-refs-tags-${version}-${os}-${arch}.tgz" unionfs.tgz
    tar -xzf unionfs.tgz -C "$(pwd)/bindings/binding-${os}-${arch}" --strip-components 1 unionfs/unionfs
    rm unionfs.tgz
  fi
}

# Download and extract nydusd and unionfs
download_nydusd ${NYDUS_VERSION} ${os} ${arch}
download_union_fs ${UNION_FS_VERSION} ${os} ${arch}
