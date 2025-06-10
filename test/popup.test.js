const test = require('node:test');
const assert = require('node:assert/strict');

function createMockDOM() {
  class MockElement {
    constructor(tagName) {
      this.tagName = tagName;
      this.classList = {
        items: new Set(),
        add: function(className) { this.items.add(className); },
        remove: function(className) { this.items.delete(className); },
        contains: function(className) { return this.items.has(className); }
      };
      this.textContent = '';
      this.eventListeners = {};
    }
    
    addEventListener(event, handler) {
      if (!this.eventListeners[event]) {
        this.eventListeners[event] = [];
      }
      this.eventListeners[event].push(handler);
    }
    
    async click() {
      if (this.eventListeners.click) {
        for (const handler of this.eventListeners.click) {
          await handler();
        }
      }
    }
  }

  const elements = {
    'apply-now': new MockElement('button'), 
    'open-settings': new MockElement('button'),
    'status': new MockElement('div')
  };

  const mockDocument = {
    getElementById: (id) => elements[id] || null,
    addEventListener: function(event, handler) {
      // DOMContentLoaded模拟
      if (event === 'DOMContentLoaded') {
        setTimeout(handler, 10);
      }
    }
  };

  return { mockDocument, elements };
}

function createMockChrome() {
  return {
    tabs: {
      query: () => Promise.resolve([{ id: 1 }]),
      sendMessage: () => Promise.resolve({ success: true })
    },
    runtime: {
      openOptionsPage: () => {}
    }
  };
}

test.beforeEach(() => {
  delete require.cache[require.resolve('../dist/popup.js')];
});

test('PopupController initializes correctly', async (t) => {
  const mockDoc = createMockDOM();
  const mockChrome = createMockChrome();
  
  global.document = mockDoc.mockDocument;
  global.chrome = mockChrome;
  global.window = { close: () => {} };
  
  require('../dist/popup.js');
  
  // PopupControllerの初期化が完了するまで十分待つ
  await new Promise(resolve => setTimeout(resolve, 50));
  
  const statusDiv = mockDoc.elements['status'];
  assert.equal(statusDiv.textContent, '準備完了', 'Status should show ready message');
});

test('Apply now button sends message to tab', async (t) => {
  const mockDoc = createMockDOM();
  const mockChrome = createMockChrome();
  
  let messageSent = false;
  let sentMessage = null;
  mockChrome.tabs.sendMessage = (tabId, message) => {
    messageSent = true;
    sentMessage = message;
    return Promise.resolve({ success: true });
  };
  
  global.document = mockDoc.mockDocument;
  global.chrome = mockChrome;
  global.window = { close: () => {} };
  
  require('../dist/popup.js');
  await new Promise(resolve => setTimeout(resolve, 10));
  
  const applyButton = mockDoc.elements['apply-now'];
  const statusDiv = mockDoc.elements['status'];
  
  // ボタンをクリック
  await applyButton.click();
  await new Promise(resolve => setTimeout(resolve, 10));
  
  assert.ok(messageSent, 'Message should be sent to active tab');
  assert.equal(sentMessage.type, 'APPLY_BIONIC', 'Should send APPLY_BIONIC message');
  assert.equal(statusDiv.textContent, '✨ Bionic Readingを適用しました！', 'Should show success message');
});

test('Settings button opens options page', async (t) => {
  const mockDoc = createMockDOM();
  const mockChrome = createMockChrome();
  
  let optionsOpened = false;
  mockChrome.runtime.openOptionsPage = () => {
    optionsOpened = true;
  };
  
  global.document = mockDoc.mockDocument;
  global.chrome = mockChrome;
  global.window = { close: () => {} };
  
  require('../dist/popup.js');
  await new Promise(resolve => setTimeout(resolve, 10));
  
  const settingsButton = mockDoc.elements['open-settings'];
  
  // ボタンをクリック
  await settingsButton.click();
  
  assert.ok(optionsOpened, 'Options page should be opened');
});

test('Apply now button handles tab message error', async (t) => {
  const mockDoc = createMockDOM();
  const mockChrome = createMockChrome();
  
  // console.errorをモック
  const originalConsoleError = console.error;
  console.error = () => {};
  
  global.document = mockDoc.mockDocument;
  global.chrome = mockChrome;
  global.window = { close: () => {} };
  
  require('../dist/popup.js');
  await new Promise(resolve => setTimeout(resolve, 10));
  
  // chrome.tabs.sendMessageでエラーを発生させる
  mockChrome.tabs.sendMessage = () => Promise.reject(new Error('Tab message error'));
  
  const applyButton = mockDoc.elements['apply-now'];
  const statusDiv = mockDoc.elements['status'];
  
  // ボタンをクリック
  await applyButton.click();
  await new Promise(resolve => setTimeout(resolve, 50));
  
  // console.errorを復元
  console.error = originalConsoleError;
  
  // エラーメッセージが表示されることを確認
  assert.equal(statusDiv.textContent, '❌ 適用に失敗しました。ページを更新してから再試行してください。', 'Should show apply error message');
}); 