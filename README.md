# Bionic Reading Extension

Chrome extension that bolds the beginning of each word to aid reading.

## Setup

1. Navigate to this directory.
2. Install dependencies and build.
   ```bash
   npm install
   npm run build
   ```
   The build outputs are placed in `dist/`.

## Loading in Chrome

1. Open `chrome://extensions` in Chrome.
2. Enable **Developer mode**.
3. Click **Load unpacked** and choose the `dist/` folder.

## Usage

1. Load any web page.
2. The extension automatically applies the Bionic Reading effect.

## ビルド・配布用ファイル
- `npm run build` または `scripts/build.sh` で `src/` のTypeScriptを `dist/` にビルドします。
- `src/popup.html`、`src/options.html` も `dist/` にコピーしてください。
- アイコン画像（`icon16.png` など）は `src/assets/` ディレクトリにまとめて配置してください。
- ビルド時（`npm run build` または `scripts/build.sh`）で自動的に `dist/` にコピーされます。

## トラブルシューティング

### 拡張機能が動作しない場合
1. Chrome Developer Tools を開き、Console でエラーを確認
2. chrome://extensions で拡張機能を一度削除し、`dist/`フォルダを再読み込み
3. `manifest.json`の権限設定を確認
4. Background script エラー: chrome://extensions → 拡張機能の「詳細」→「サービスワーカー」のエラーを確認

### テスト実行
```bash
# 全テスト実行
npm test

# 個別テスト実行
npm test test/content.test.js
npm test test/popup.test.js
npm test test/background.test.js
npm test test/integration.test.js

# カバレッジ付きテスト
npm run test
```

### 現在のテストカバレッジ
- **全体**: 88.33% ⭐
- **background.js**: 93.33%
- **content.js**: 79.44%
- **popup.js**: 93.18%
- **テスト数**: 31件 (全てパス ✅)

### Chrome拡張機能として動作確認済み
✅ ツールバーアイコン表示  
✅ ポップアップUI (ON/OFF切り替え、手動実行)  
✅ オプションページ  
✅ Bionic Reading自動適用  
✅ エラーハンドリング完備
