/**
 * @license
 * Copyright 2023 Google LLC  
 * SPDX-License-Identifier: Apache-2.0
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

// distフォルダのコンテンツを読み込み
const backgroundScript = fs.readFileSync(
  path.join(__dirname, '../dist/background.js'),
  'utf-8'
);

// Chrome APIモック関数
function createMockChrome() {
  let messageHandlers = [];
  let installedHandlers = [];
  let storage = {};
  let shouldReject = {};
  
  const mockStorage = {
    get: (keys) => {
      if (shouldReject.get) {
        return Promise.reject(shouldReject.get);
      }
      if (typeof keys === 'object' && keys !== null) {
        const result = { ...keys };
        Object.keys(keys).forEach(key => {
          if (storage[key] !== undefined) {
            result[key] = storage[key];
          }
        });
        return Promise.resolve(result);
      }
      if (typeof keys === 'string') {
        return Promise.resolve({ [keys]: storage[keys] });
      }
      return Promise.resolve(storage);
    },
    set: (data) => {
      if (shouldReject.set) {
        return Promise.reject(shouldReject.set);
      }
      Object.assign(storage, data);
      return Promise.resolve();
    }
  };
  
  return {
    storage: {
      sync: mockStorage
    },
    runtime: {
      onMessage: {
        addListener: (handler) => messageHandlers.push(handler)
      },
      onInstalled: { 
        addListener: (handler) => installedHandlers.push(handler) 
      }
    },
    
    // テスト用のヘルパーメソッド
    _triggerMessage: async (message, sender) => {
      return new Promise(resolve => {
        if (messageHandlers.length > 0) {
          messageHandlers[0](message, sender, resolve);
        } else {
          resolve({ success: false, message: 'No handler found' });
        }
      });
    },
    _triggerInstalled: async () => {
      for (const handler of installedHandlers) {
        await handler();
      }
    },
    _getStorage: () => ({ ...storage }),
    _clearStorage: () => { storage = {}; },
    _setStorageError: (operation, error) => { shouldReject[operation] = error; },
    _clearStorageError: (operation) => { delete shouldReject[operation]; }
  };
}

test.beforeEach(() => {
  delete require.cache[require.resolve('../dist/background.js')];
});

test('BackgroundService initializes correctly', async () => {
  const mockChrome = createMockChrome();
  global.chrome = mockChrome;
  
  // エラーなく初期化できることを確認
  require('../dist/background.js');
  assert.ok(true, 'Background service should initialize without errors');
});

test('Settings initialization on install', async () => {
  const mockChrome = createMockChrome();
  global.chrome = mockChrome;
  
  require('../dist/background.js');
  
  // インストールイベントをトリガー
  await mockChrome._triggerInstalled();
  
  // 非同期処理の完了を待つ
  await new Promise(resolve => setTimeout(resolve, 50));
  
  // デフォルト設定が保存されることを確認
  const storage = mockChrome._getStorage();
  assert.equal(storage.intensity, 2, 'Should initialize with default intensity setting');
});

test('Settings initialization skips when settings exist', async () => {
  const mockChrome = createMockChrome();
  global.chrome = mockChrome;
  
  // 既存の設定を準備
  await mockChrome.storage.sync.set({ intensity: 4 });
  
  require('../dist/background.js');
  
  // インストールイベントをトリガー
  await mockChrome._triggerInstalled();
  await new Promise(resolve => setTimeout(resolve, 50));
  
  // 既存の設定が保持されることを確認
  const storage = mockChrome._getStorage();
  assert.equal(storage.intensity, 4, 'Should preserve existing settings');
});

test('Settings initialization handles storage errors', async () => {
  const mockChrome = createMockChrome();
  global.chrome = mockChrome;
  
  // console.errorをモック
  const originalConsoleError = console.error;
  let errorCalled = false;
  console.error = () => { errorCalled = true; };
  
  // ストレージエラーを設定
  mockChrome._setStorageError('get', new Error('Storage error'));
  
  require('../dist/background.js');
  await mockChrome._triggerInstalled();
  await new Promise(resolve => setTimeout(resolve, 50));
  
  // console.errorを復元
  console.error = originalConsoleError;
  
  assert.ok(errorCalled, 'Should log error when storage fails');
});

test('GET_SETTINGS message returns current settings', async () => {
  const mockChrome = createMockChrome();
  global.chrome = mockChrome;
  
  // テスト用の設定を準備
  await mockChrome.storage.sync.set({ intensity: 3 });
  
  require('../dist/background.js');
  
  const response = await mockChrome._triggerMessage(
    { type: 'GET_SETTINGS' },
    {}
  );
  
  assert.equal(response.success, true, 'Should return success');
  assert.equal(response.settings.intensity, 3, 'Should return current settings');
});

test('Unknown message type returns error', async () => {
  const mockChrome = createMockChrome();
  global.chrome = mockChrome;
  
  require('../dist/background.js');
  
  const response = await mockChrome._triggerMessage(
    { type: 'UNKNOWN_TYPE' },
    {}
  );
  
  assert.equal(response.success, false, 'Should return error for unknown message type');
  assert.equal(response.message, '不明なメッセージタイプ', 'Should have correct error message');
});

test('Message error handling', async () => {
  const mockChrome = createMockChrome();
  global.chrome = mockChrome;
  
  // console.errorをモック
  const originalConsoleError = console.error;
  let errorLogged = false;
  console.error = () => { errorLogged = true; };
  
  // ストレージエラーを発生させる
  mockChrome._setStorageError('get', new Error('Storage error'));
  
  require('../dist/background.js');
  
  // メッセージハンドラーでエラーを発生させるメッセージを送信
  const response = await mockChrome._triggerMessage(
    { type: 'GET_SETTINGS' },
    {}
  );

  // console.errorを復元
  console.error = originalConsoleError;
  
  assert.equal(response.success, false, 'Should handle message errors gracefully');
  assert.ok(response.error, 'Should include error information');
  assert.ok(errorLogged, 'Should log error to console');
});

test('Null message handling', async () => {
  const mockChrome = createMockChrome();
  global.chrome = mockChrome;
  
  require('../dist/background.js');
  
  const response = await mockChrome._triggerMessage(null, {});
  
  assert.equal(response.success, false, 'Should handle null messages gracefully');
  assert.ok(response.error, 'Should return error information');
});

test('Storage set error handling during initialization', async () => {
  const mockChrome = createMockChrome();
  global.chrome = mockChrome;
  
  // console.errorをモック
  const originalConsoleError = console.error;
  let errorLogged = false;
  console.error = () => { errorLogged = true; };
  
  // storage.setでエラーを発生させる
  mockChrome._setStorageError('set', new Error('Storage write error'));
  
  require('../dist/background.js');
  await mockChrome._triggerInstalled();
  await new Promise(resolve => setTimeout(resolve, 50));
  
  // console.errorを復元
  console.error = originalConsoleError;
  
  assert.ok(errorLogged, 'Should log error when storage set fails');
}); 