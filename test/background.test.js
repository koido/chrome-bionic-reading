const test = require('node:test');
const assert = require('node:assert/strict');

function createMockChrome() {
  let messageHandlers = [];
  let installedHandlers = [];
  let storage = {};
  
  return {
    storage: {
      sync: {
        get: (keys) => {
          if (typeof keys === 'object') {
            const result = { ...keys };
            Object.keys(keys).forEach(key => {
              if (storage[key] !== undefined) {
                result[key] = storage[key];
              }
            });
            return Promise.resolve(result);
          }
          return Promise.resolve({ [keys]: storage[keys] });
        },
        set: (data) => {
          Object.assign(storage, data);
          return Promise.resolve();
        }
      }
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
    _triggerInstalled: () => {
      installedHandlers.forEach(handler => handler());
    },
    _getStorage: () => ({ ...storage }),
    _clearStorage: () => { storage = {}; }
  };
}

test.beforeEach(() => {
  delete require.cache[require.resolve('../dist/background.js')];
});

test('BackgroundService initializes correctly', async (t) => {
  const mockChrome = createMockChrome();
  global.chrome = mockChrome;
  
  // エラーなく初期化できることを確認
  require('../dist/background.js');
  assert.ok(true, 'Background service should initialize without errors');
});

test('Settings initialization on install', async (t) => {
  const mockChrome = createMockChrome();
  global.chrome = mockChrome;
  
  require('../dist/background.js');
  
  // インストールイベントをトリガー
  mockChrome._triggerInstalled();
  
  // 非同期処理の完了を待つ
  await new Promise(resolve => setTimeout(resolve, 50));
  
  // デフォルト設定が保存されることを確認
  const storage = mockChrome._getStorage();
  assert.equal(storage.intensity, 2, 'Should initialize with default intensity setting');
});

test('Settings initialization skips when settings exist', async (t) => {
  const mockChrome = createMockChrome();
  global.chrome = mockChrome;
  
  // 既存の設定を準備
  await mockChrome.storage.sync.set({ intensity: 4 });
  
  require('../dist/background.js');
  
  // インストールイベントをトリガー
  mockChrome._triggerInstalled();
  await new Promise(resolve => setTimeout(resolve, 50));
  
  // 既存の設定が保持されることを確認
  const storage = mockChrome._getStorage();
  assert.equal(storage.intensity, 4, 'Should preserve existing settings');
});

test('GET_SETTINGS message returns current settings', async (t) => {
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

test('Unknown message type returns error', async (t) => {
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

test('Message error handling', async (t) => {
  const mockChrome = createMockChrome();
  global.chrome = mockChrome;
  
  // console.errorをモック
  const originalConsoleError = console.error;
  console.error = () => {};
  
  // ストレージエラーを発生させる
  mockChrome.storage.sync.get = () => Promise.reject(new Error('Storage error'));
  
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
}); 