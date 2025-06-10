#!/bin/bash
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"

bash "$DIR/build.sh"
bash "$DIR/test.sh" 