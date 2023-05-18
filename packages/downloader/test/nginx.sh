#/usr/bin/env bash

TEMPLATE_FILE="${PWD}/test/nginx.example.conf"
CONFIG_FILE="${PWD}/test/nginx.conf"
BLOBS_DIR="${PWD}/test/fixtures/tar"
USER="$(whoami)"

# check nginx bin
if ! command -v nginx; then
	echo 'Nginx is not present in current enviroment, please install it first.'
	echo 'Example: brew install nginx'
	exit 1
fi

echo ""
echo "TEMPLATE CONFIG: ${TEMPLATE_FILE}"
cat ${TEMPLATE_FILE}
echo ""

sed -e "s+blobs+${BLOBS_DIR}+g" -e "s+current_user+${USER}+g" $TEMPLATE_FILE > $CONFIG_FILE

echo ""
echo "NEW CONFIG: ${CONFIG_FILE}:"
cat ${CONFIG_FILE}
echo ""

killall nginx
nginx -c $CONFIG_FILE
