/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

interface BionicSettings {
  intensity: number; // 1=弱め, 2=やや弱め, 3=普通, 4=やや強め, 5=強め
}

class BackgroundService {
  private defaultSettings: BionicSettings = { intensity: 2 }; // デフォルト: やや弱め

  constructor() {
    this.init();
  }

  init(): void {
    this.setupEventListeners();
  }

  setupEventListeners(): void {
    // インストール・更新時の初期化
    chrome.runtime.onInstalled.addListener(() => {
      this.initializeSettings();
    });

    // メッセージハンドリング（将来の拡張性のため）
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // 非同期レスポンス
    });
  }

  async initializeSettings(): Promise<void> {
    try {
      // 既存の設定をチェック
      const result = await chrome.storage.sync.get('intensity');
      
      // 設定が存在しない場合のみデフォルト値を設定
      if (result.intensity === undefined) {
        await chrome.storage.sync.set(this.defaultSettings);
        console.log('Bionic Reading: デフォルト設定を初期化しました');
      }
    } catch (error) {
      console.error('設定初期化エラー:', error);
    }
  }

  async handleMessage(message: any, sender: any, sendResponse: (response: any) => void): Promise<void> {
    try {
      switch (message.type) {
        case 'GET_SETTINGS':
          const settings = await chrome.storage.sync.get(this.defaultSettings);
          sendResponse({ success: true, settings });
          break;
          
        default:
          sendResponse({ success: false, message: '不明なメッセージタイプ' });
      }
    } catch (error) {
      console.error('メッセージ処理エラー:', error);
      sendResponse({ success: false, error: (error as Error).message });
    }
  }
}

// バックグラウンドサービスを開始
new BackgroundService(); 