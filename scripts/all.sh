#!/bin/bash
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"

rm -rf "$DIR/../dist/*"

bash "$DIR/build.sh"
bash "$DIR/test.sh" 