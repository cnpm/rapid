#!/bin/bash

set -eux

TARGET="${CARGO_BUILD_TARGET:-x86_64-apple-darwin}"
OS="${BUILD_OS:-darwin}"
ARCH="${BUILD_ARCH:-amd64}"
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
