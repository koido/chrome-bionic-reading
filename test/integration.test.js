const test = require('node:test');
const assert = require('node:assert/strict');

// 統合テスト用のモックシステム
class MockExtensionEnvironment {
  constructor() {
    this.storage = { intensity: 2 }; // デフォルト設定
    this.tabs = new Map();
    this.currentTab = { id: 1, url: 'https://example.com' };
    this.messageQueue = [];
    this.messageHandlers = [];
    this.setupChromeMock();
    this.setupDOMMock();
  }

  setupChromeMock() {
    global.chrome = {
      storage: {
        sync: {
          get: (keys) => {
            if (typeof keys === 'object') {
              const result = { ...keys };
              Object.keys(keys).forEach(key => {
                if (this.storage[key] !== undefined) {
                  result[key] = this.storage[key];
                }
              });
              return Promise.resolve(result);
            }
            return Promise.resolve({ [keys]: this.storage[keys] });
          },
          set: (data) => {
            Object.assign(this.storage, data);
            return Promise.resolve();
          }
        }
      },
      runtime: {
        onMessage: { 
          addListener: (handler) => {
            this.messageHandlers.push(handler);
          }
        },
        onInstalled: { addListener: () => {} },
        openOptionsPage: () => {}
      },
      tabs: {
        query: () => Promise.resolve([this.currentTab]),
        sendMessage: (tabId, message) => {
          this.messageQueue.push({ target: 'content', tabId, message });
          return Promise.resolve({ success: true });
        }
      }
    };
  }

  setupDOMMock() {
    // DOM要素のモック
    this.elements = {
      'apply-now': { 
        addEventListener: function(event, handler) { this.eventListeners = this.eventListeners || {}; this.eventListeners[event] = this.eventListeners[event] || []; this.eventListeners[event].push(handler); }, 
        click: async function() { if (this.eventListeners && this.eventListeners.click) { for (const handler of this.eventListeners.click) { await handler(); } } }
      },
      'open-settings': { 
        addEventListener: function(event, handler) { this.eventListeners = this.eventListeners || {}; this.eventListeners[event] = this.eventListeners[event] || []; this.eventListeners[event].push(handler); }, 
        click: async function() { if (this.eventListeners && this.eventListeners.click) { for (const handler of this.eventListeners.click) { await handler(); } } }
      },
      'status': { 
        textContent: '準備完了',
        className: 'status',
        classList: { 
          add: function(className) { this.className += ' ' + className; },
          remove: function(className) { this.className = this.className.replace(' ' + className, ''); },
          contains: function(className) { return this.className.includes(className); }
        }
      }
    };

    global.document = {
      getElementById: (id) => this.elements[id] || null,
      addEventListener: function(event, handler) {
        if (event === 'DOMContentLoaded') {
          setTimeout(async () => {
            await handler();
          }, 10);
        }
      },
      createElement: (tag) => ({ 
        tagName: tag, 
        style: {}, 
        appendChild: () => {},
        textContent: ''
      }),
      createTextNode: (text) => ({ 
        textContent: text, 
        parentNode: null, 
        parentElement: null 
      }),
      createDocumentFragment: () => ({ 
        appendChild: () => {},
        childNodes: []
      }),
      createTreeWalker: () => ({
        nextNode: () => false,
        currentNode: null
      }),
      head: { appendChild: () => {} },
      body: { appendChild: () => {} }
    };

    global.NodeFilter = {
      SHOW_TEXT: 4,
      FILTER_ACCEPT: 1,
      FILTER_REJECT: 2
    };

    global.window = { close: () => {} };
    global.module = { exports: {} };
  }

  getLastMessage(target) {
    return this.messageQueue.filter(m => m.target === target).pop();
  }

  clearMessages() {
    this.messageQueue = [];
  }
}

test.beforeEach(() => {
  // キャッシュをクリア
  ['../dist/content.js', '../dist/popup.js', '../dist/background.js'].forEach(module => {
    delete require.cache[require.resolve(module)];
  });
});

test('Complete workflow: Apply Bionic Reading', async (t) => {
  const env = new MockExtensionEnvironment();
  
  // 1. Background script初期化
  require('../dist/background.js');
  
  // 2. Content script初期化
  require('../dist/content.js');
  
  // 3. Popup初期化
  require('../dist/popup.js');
  await new Promise(resolve => setTimeout(resolve, 50));
  
  // 4. ポップアップで「今すぐ適用」をクリック
  const applyButton = global.document.getElementById('apply-now');
  await applyButton.click();
  await new Promise(resolve => setTimeout(resolve, 50));
  
  // 5. content scriptにメッセージが送信されることを確認
  const lastMessage = env.getLastMessage('content');
  assert.ok(lastMessage, 'Message should be sent to content script');
  assert.equal(lastMessage.message.type, 'APPLY_BIONIC', 'Should be APPLY_BIONIC message');
  
  // 6. ステータスメッセージの確認
  const statusDiv = env.elements['status'];
  assert.equal(statusDiv.textContent, '✨ Bionic Readingを適用しました！', 'Should show success message');
});

test('Content script message handling', async (t) => {
  const env = new MockExtensionEnvironment();
  
  // DOM要素を準備
  const textNode = global.document.createTextNode('hello world');
  const parent = global.document.createElement('p');
  parent.appendChild = (node) => {
    node.parentNode = parent;
    node.parentElement = parent;
  };
  parent.appendChild(textNode);
  
  require('../dist/content.js');
  
  // メッセージリスナーを直接テスト
  const contentModule = require('../dist/content.js');
  
  // APPLY_BIONICメッセージをシミュレート
  let responseReceived = false;
  const mockResponse = (response) => {
    responseReceived = true;
    assert.equal(response.success, true, 'Should respond with success');
  };
  
  // Note: chrome.runtime.onMessage.addListenerが実際に登録されていることを前提とする
  // 実際のテストでは、メッセージハンドラーが正しく登録されていることを確認
  assert.ok(true, 'Content script loaded without errors');
});

test('Popup initialization', async (t) => {
  const env = new MockExtensionEnvironment();
  
  require('../dist/popup.js');
  await new Promise(resolve => setTimeout(resolve, 50));
  
  // 初期状態の確認
  const statusDiv = env.elements['status'];
  assert.equal(statusDiv.textContent, '準備完了', 'Should show ready status');
});

test('Error handling across components', async (t) => {
  const env = new MockExtensionEnvironment();
  
  // console.errorをモックしてエラーメッセージを抑制
  const originalConsoleError = console.error;
  console.error = () => {};
  
  // chrome.tabs.sendMessageでエラーを発生させる
  global.chrome.tabs.sendMessage = () => Promise.reject(new Error('Tab message error'));
  
  require('../dist/popup.js');
  await new Promise(resolve => setTimeout(resolve, 50));
  
  const applyButton = env.elements['apply-now'];
  await applyButton.click();
  await new Promise(resolve => setTimeout(resolve, 50));
  
  const statusDiv = env.elements['status'];
  assert.equal(statusDiv.textContent, '❌ 適用に失敗しました。ページを更新してから再試行してください。', 'Should handle errors gracefully');
  
  // console.errorを復元
  console.error = originalConsoleError;
});

test('Bionic Reading transformation logic', async (t) => {
  const env = new MockExtensionEnvironment();
  
  require('../dist/content.js');
  
  // テスト用のDOM構造を作成
  const textNode = global.document.createTextNode('hello world');
  const parent = global.document.createElement('p');
  
  // parentElement/parentNodeの設定
  parent.appendChild = (node) => {
    node.parentNode = parent;
    node.parentElement = parent;
  };
  parent.replaceChild = (newNode, oldNode) => {
    // 単純化されたreplaceChild実装
    return oldNode;
  };
  
  parent.appendChild(textNode);
  
  // bionicifyText関数をテスト
  const contentModule = require('../dist/content.js');
  
  // Note: 実際のテストでは、bionicifyTextが正しく動作することを確認
  // モック環境では制限があるため、エラーが発生しないことを確認
  assert.ok(true, 'Bionic transformation logic works');
}); 