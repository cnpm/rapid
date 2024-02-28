#!/bin/bash

set -eux

# Define versions
NYDUS_VERSION=v2.0.0-cnpm.alpha.2
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

# Download and extract nydusd and unionfs
download_nydusd ${NYDUS_VERSION} ${os} ${arch}
