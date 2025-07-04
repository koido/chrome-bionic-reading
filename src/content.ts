/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

interface BionicSettings {
  intensity: number; // 0=なし, 1=弱め, 2=やや弱め, 3=普通, 4=やや強め, 5=強め
  lineHeight: number; // 行間
}

let currentSettings: BionicSettings = { intensity: 2, lineHeight: 1.6 }; // デフォルト: やや弱め

/**
 * Injects a global style element to tweak page line height.
 * @returns {void}
 */
function injectStyle(): void {
  let style = document.getElementById('bionic-style') as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement('style');
    style.id = 'bionic-style';
    document.head.appendChild(style);
  }
  style.textContent = `body { line-height: ${currentSettings.lineHeight} !important; }`;
}

/**
 * Applies the Bionic Reading effect to a text node.
 * @param {Text} textNode The text node to transform.
 * @returns {void}
 */
function bionicifyText(textNode: Text): void {
  const text = textNode.textContent || '';
  const parent = textNode.parentNode;
  
  if (!parent) {
    return;
  }

  // intensity が 0 の場合は太字化を行わない（行間のみ適用）
  if (currentSettings.intensity === 0) {
    return;
  }

  const frag = document.createDocumentFragment();
  const parts = text.split(/(\s+)/);

  for (const part of parts) {
    if (/^\s+$/.test(part)) {
      frag.appendChild(document.createTextNode(part));
    } else {
      const span = document.createElement('span');
      // 設定に応じた太字化の程度を適用
      const boundary = Math.min(currentSettings.intensity, part.length);
      span.textContent = part.slice(0, boundary);
      span.style.fontWeight = 'bold';
      frag.appendChild(span);
      frag.appendChild(document.createTextNode(part.slice(boundary)));
    }
  }

  parent.replaceChild(frag, textNode);
}

function acceptNode(node: Text): number {
  if (!node.textContent || !node.textContent.trim()) {
    return NodeFilter.FILTER_REJECT;
  }
  
  if (!node.parentElement) {
    return NodeFilter.FILTER_REJECT;
  }

  const tag = node.parentElement.tagName.toLowerCase();
  if ([
    'script', 
    'style', 
    'textarea',
  ].includes(tag)) {
    return NodeFilter.FILTER_REJECT;
  }

  return NodeFilter.FILTER_ACCEPT;
}

/**
 * Walks the DOM tree and converts text nodes to the Bionic format.
 * @param {Node} root Root node to traverse.
 * @returns {void}
 */
function traverse(root: Node): void {
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    { acceptNode }
  );

  const nodes: Text[] = [];
  while (walker.nextNode()) {
    nodes.push(walker.currentNode as Text);
  }

  for (const n of nodes) {
    bionicifyText(n);
  }
}

/**
 * 設定を読み込む
 */
async function loadSettings(): Promise<void> {
  try {
    const result = await chrome.storage.sync.get({ intensity: 2, lineHeight: 1.6 });
    currentSettings = result as BionicSettings;
  } catch (error) {
    // テスト環境（Node.js）以外でのみエラーログを出力
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      console.error('設定の読み込みに失敗:', error);
    }
    currentSettings = { intensity: 2, lineHeight: 1.6 }; // デフォルト値
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  injectStyle();
  traverse(document.body);
});

// ポップアップやバックグラウンドからのメッセージを処理
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    switch (message.type) {
      case 'APPLY_BIONIC':
        loadSettings().then(() => {
          injectStyle();
          traverse(document.body);
          sendResponse({ success: true, message: 'Bionic Reading を適用しました' });
        });
        break;
        
      case 'AID_READING':
        // background.jsからのアクション（従来の動作）
        loadSettings().then(() => {
          injectStyle();
          traverse(document.body);
          sendResponse({ success: true });
        });
        break;
        
      default:
        sendResponse({ success: false, message: '不明なメッセージタイプ' });
    }
  } catch (error) {
    console.error('メッセージ処理エラー:', error);
    sendResponse({ success: false, message: 'エラーが発生しました' });
  }
  
  return true; // 非同期レスポンスを示す
});

// テスト用のexport（テスト環境でのみ使用）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { injectStyle, bionicifyText, traverse, acceptNode, loadSettings };
}
