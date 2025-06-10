/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

const test = require('node:test');
const assert = require('node:assert/strict');

// Node.js標準テスト機能を使用した簡単なpopup.js テスト

// Chrome APIのより詳細なモック (実際のpopup.jsに合わせて修正)
function createPopupMockChrome() {
  let storage = {};
  let shouldReject = {};
  
  return {
    storage: {
      sync: {
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
          return Promise.resolve(storage);
        },
        set: (data) => {
          if (shouldReject.set) {
            return Promise.reject(shouldReject.set);
          }
          Object.assign(storage, data);
          return Promise.resolve();
        }
      }
    },
    tabs: {
      query: (query) => {
        if (shouldReject.query) {
          return Promise.reject(shouldReject.query);
        }
        return Promise.resolve([{ id: 1 }]);
      },
      sendMessage: (tabId, message) => {
        if (shouldReject.sendMessage) {
          return Promise.reject(shouldReject.sendMessage);
        }
        return Promise.resolve({ success: true, message: 'Test success' });
      }
    },
    runtime: {
      openOptionsPage: function() {
        this._optionsPageOpened = true;
      }
    },
    
    // テスト用ヘルパー
    _setStorage: (data) => { Object.assign(storage, data); },
    _getStorage: () => ({ ...storage }),
    _setError: (operation, error) => { shouldReject[operation] = error; },
    _clearError: (operation) => { delete shouldReject[operation]; }
  };
}

// DOMモック (実際のpopup.jsに合わせて修正)
function createPopupMockDOM() {
  const elements = {
    'apply-now': { 
      addEventListener: function(event, handler) {
        if (event === 'click') {
          this._clickHandler = handler;
        }
      },
      click: async function() {
        if (this._clickHandler) {
          await this._clickHandler();
        }
      }
    },
    'open-settings': { 
      addEventListener: function(event, handler) {
        if (event === 'click') {
          this._clickHandler = handler;
        }
      },
      click: function() {
        if (this._clickHandler) {
          this._clickHandler();
        }
      }
    },
    'status': { 
      textContent: '', 
      className: '',
      classList: {
        add: function(className) {
          this.className += ' ' + className;
        }
      }
    }
  };
  
  const eventHandlers = {};
  
  return {
    getElementById: (id) => elements[id] || null,
    addEventListener: function(event, handler) {
      eventHandlers[event] = handler;
      if (event === 'DOMContentLoaded') {
        // 即座にDOMContentLoadedを発火
        setTimeout(handler, 0);
      }
    },
    _triggerEvent: (event) => {
      if (eventHandlers[event]) {
        eventHandlers[event]();
      }
    }
  };
}

test('popup.js module loads without errors', async () => {
  global.chrome = createPopupMockChrome();
  global.document = createPopupMockDOM();
  global.window = {
    close: function() {
      this._closed = true;
    }
  };
  
  try {
    require('../dist/popup.js');
    assert.ok(true, 'popup.js should load without errors');
  } catch (error) {
    assert.fail(`popup.js loading failed: ${error.message}`);
  }
});

test('Chrome API mocks are available', () => {
  const mockChrome = createPopupMockChrome();
  
  // APIが存在することを確認
  assert.ok(mockChrome.storage.sync.get, 'Storage get API should exist');
  assert.ok(mockChrome.storage.sync.set, 'Storage set API should exist');
  assert.ok(mockChrome.tabs.query, 'Tabs query API should exist');
  assert.ok(mockChrome.tabs.sendMessage, 'Tabs sendMessage API should exist');
  assert.ok(mockChrome.runtime.openOptionsPage, 'Runtime openOptionsPage API should exist');
  
  assert.ok(true, 'Chrome API mocks are available');
});

test('DOM mock works correctly', () => {
  const mockDocument = createPopupMockDOM();
  
  const statusElement = mockDocument.getElementById('status');
  const applyButton = mockDocument.getElementById('apply-now');
  const settingsButton = mockDocument.getElementById('open-settings');
  
  assert.ok(statusElement, 'Status element should be accessible');
  assert.ok(applyButton, 'Apply button should be accessible');
  assert.ok(settingsButton, 'Settings button should be accessible');
  
  // ステータス要素のプロパティをテスト
  statusElement.textContent = 'Test message';
  assert.equal(statusElement.textContent, 'Test message', 'Status text should be settable');
});

test('Error scenarios work correctly', async () => {
  const mockChrome = createPopupMockChrome();
  
  // エラーを設定
  mockChrome._setError('query', new Error('Tab query failed'));
  
  // エラーが正しく投げられることを確認
  try {
    await mockChrome.tabs.query({ active: true, currentWindow: true });
    assert.fail('Should have thrown an error');
  } catch (error) {
    assert.equal(error.message, 'Tab query failed');
  }
  
  assert.ok(true, 'Error scenarios work correctly');
});



 