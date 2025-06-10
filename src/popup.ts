/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

class PopupController {
  private applyNowButton: HTMLElement;
  private openSettingsButton: HTMLElement;
  private statusDiv: HTMLElement;

  constructor() {
    this.applyNowButton = document.getElementById('apply-now')!;
    this.openSettingsButton = document.getElementById('open-settings')!;
    this.statusDiv = document.getElementById('status')!;
    this.init();
  }

  init(): void {
    this.setupEventListeners();
    this.updateStatus('準備完了');
  }

  updateStatus(message: string, type: 'default' | 'success' | 'error' = 'default'): void {
    this.statusDiv.textContent = message;
    this.statusDiv.className = 'status';
    if (type !== 'default') {
      this.statusDiv.classList.add(type);
    }
  }

  setupEventListeners(): void {
    // 今すぐ適用
    this.applyNowButton.addEventListener('click', async () => {
      try {
        this.updateStatus('適用中...', 'default');
        
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs[0]?.id) {
          await chrome.tabs.sendMessage(tabs[0].id, { type: 'APPLY_BIONIC' });
          this.updateStatus('✨ Bionic Readingを適用しました！', 'success');
          
          // ポップアップを2秒後に閉じる
          setTimeout(() => window.close(), 2000);
        }
      } catch (error) {
        console.error('適用に失敗:', error);
        this.updateStatus('❌ 適用に失敗しました。ページを更新してから再試行してください。', 'error');
      }
    });

    // 設定ページを開く
    this.openSettingsButton.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
      window.close();
    });
  }
}

// DOM読み込み完了時に初期化
document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
}); 