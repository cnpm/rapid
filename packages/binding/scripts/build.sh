#!/usr/bin/env bash

UNAME=$(uname -s)
ARCH=$(uname -m)
PWD=$(pwd)
OPENSSL_DIR=${PWD}/openssl
OPENSSL_LIB_DIR=${PWD}/openssl/lib
OPENSSL_INCLUDE_DIR=${PWD}/openssl/include

echo "OPENSSL_DIR: ${OPENSSL_DIR}"
echo "OPENSSL_LIB_DIR: ${OPENSSL_LIB_DIR}"
echo "OPENSSL_INCLUDE_DIR: ${OPENSSL_INCLUDE_DIR}"

build_in_macos() {
  napi build --release
}

build_in_linux() {
  rm -rf ${OPENSSL_DIR}
  mkdir ${OPENSSL_DIR}
  tar -xzvf ${PWD}/deps/openssl-1.1.1.${ARCH}.tgz -C ${OPENSSL_DIR}
  OPENSSL_DIR=${OPENSSL_DIR} OPENSSL_STATIC=1 OPENSSL_LIB_DIR=${OPENSSL_LIB_DIR} OPENSSL_INCLUDE_DIR=${OPENSSL_INCLUDE_DIR} napi build --release
}

build() {
  if [ "${UNAME}" == "Darwin" ]; then
      build_in_macos
  else
      build_in_linux
  fi
}

build
