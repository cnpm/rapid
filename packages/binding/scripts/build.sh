#!/bin/bash

set -eux

# 检测系统架构并设置 ARCH 和 TARGET 变量
case $(uname -m) in
    "x86_64")
        ARCH="amd64"
        TARGET="x86_64-apple-darwin"
        ;;
    "arm64")
        ARCH="aarch64"
        TARGET="aarch64-apple-darwin"
        ;;
    *)
        echo "Unsupported architecture: $(uname -m)"
        exit 1
        ;;
esac

OS="${BUILD_OS:-darwin}"
# 使用检测到的架构和目标平台作为默认值
ARCH="${BUILD_ARCH:-$ARCH}"
TARGET="${CARGO_BUILD_TARGET:-$TARGET}"
PWD=$(pwd)
OPENSSL_DIR=${PWD}/openssl
OPENSSL_LIB_DIR=${PWD}/openssl/lib
OPENSSL_INCLUDE_DIR=${PWD}/openssl/include

echo "OPENSSL_DIR: ${OPENSSL_DIR}"
echo "OPENSSL_LIB_DIR: ${OPENSSL_LIB_DIR}"
echo "OPENSSL_INCLUDE_DIR: ${OPENSSL_INCLUDE_DIR}"

build_in_macos() {
  rustup target add ${TARGET}
  napi build --release --target ${TARGET}
}

build_in_linux() {
  rustup target add ${TARGET}
  rm -rf ${OPENSSL_DIR}
  mkdir ${OPENSSL_DIR}
  tar -xzvf ${PWD}/deps/openssl-1.1.1.${ARCH}.tgz -C ${OPENSSL_DIR}
  OPENSSL_DIR=${OPENSSL_DIR} OPENSSL_STATIC=1 OPENSSL_LIB_DIR=${OPENSSL_LIB_DIR} OPENSSL_INCLUDE_DIR=${OPENSSL_INCLUDE_DIR} napi build --release --target ${TARGET}
}

build() {
  if [[ "${OS}" == "darwin" ]]; then
      build_in_macos
  else
      build_in_linux
  fi
}

echo "build target: ${TARGET}"
build
