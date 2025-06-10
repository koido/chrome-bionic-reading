#!/bin/bash
set -e

# スクリプトディレクトリへ移動
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/.."

# ネットワークチェック関数
check_network() {
  if command -v nc >/dev/null 2>&1; then
    nc -zw3 registry.npmjs.org 443 >/dev/null 2>&1
    return $?
  elif command -v curl >/dev/null 2>&1; then
    curl --head --silent --max-time 3 https://registry.npmjs.org >/dev/null 2>&1
    return $?
  else
    echo "Warning: neither 'nc' nor 'curl' available; assuming *no* network" >&2
    return 1
  fi
}

# 依存解決
if check_network; then
  echo "Network available - running npm install"
  if ! npm ci --prefer-offline --no-audit; then
    echo ""
    echo "npm install failed. Please check the error messages above."
    exit 1
  fi
else
  echo "No network detected."
  if [ -d node_modules ]; then
    echo "Using cached node_modules directory."
  else
    echo "node_modules directory not found and cannot install dependencies." >&2
    exit 1
  fi
fi

# typescriptがpackage.jsonに無ければ自動インストール
if ! grep -q '"typescript"' package.json; then
  echo "[INFO] typescript not found in package.json. Installing..."
  npm install --save-dev typescript
fi

# TypeScriptビルド
npx tsc

# esbuildによるcontent scriptバンドル（必要なら有効化）
# npx esbuild src/content.ts --bundle --format=iife --outfile=dist/content.js --platform=browser

npm run build

cp manifest.json src/popup.html src/options.html dist/
for size in 16 32 48 128; do
  [ -f icon${size}.png ] && cp icon${size}.png dist/
done 