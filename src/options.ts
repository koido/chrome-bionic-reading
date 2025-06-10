/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

interface BionicSettings {
  intensity: number; // 1=弱め, 2=やや弱め, 3=普通, 4=やや強め, 5=強め
}

class OptionsController {
  private intensityInputs: NodeListOf<HTMLInputElement>;
  private saveButton: HTMLButtonElement;
  private statusDiv: HTMLElement;
  private previewDiv: HTMLElement;
  
  private readonly previewTexts: { [key: number]: string } = {
    1: 'これは <strong>B</strong>ionic <strong>R</strong>eading の <strong>プ</strong>レビュー <strong>テ</strong>キスト です。 <strong>設</strong>定 を <strong>変</strong>更 すると <strong>こ</strong>の <strong>テ</strong>キスト が <strong>リ</strong>アルタイム で <strong>更</strong>新 されます。',
    2: 'これは <strong>Bi</strong>onic <strong>Re</strong>ading の <strong>プレ</strong>ビュー <strong>テキ</strong>スト です。 <strong>設定</strong> を <strong>変更</strong> すると <strong>この</strong> <strong>テキ</strong>スト が <strong>リア</strong>ルタイム で <strong>更新</strong> されます。',
    3: 'これは <strong>Bio</strong>nic <strong>Rea</strong>ding の <strong>プレビ</strong>ュー <strong>テキス</strong>ト です。 <strong>設定</strong> を <strong>変更</strong> すると <strong>この</strong> <strong>テキス</strong>ト が <strong>リアル</strong>タイム で <strong>更新</strong> されます。',
    4: 'これは <strong>Bion</strong>ic <strong>Read</strong>ing の <strong>プレビュ</strong>ー <strong>テキスト</strong> です。 <strong>設定</strong> を <strong>変更</strong> すると <strong>この</strong> <strong>テキスト</strong> が <strong>リアルタ</strong>イム で <strong>更新</strong> されます。',
    5: 'これは <strong>Bioni</strong>c <strong>Readi</strong>ng の <strong>プレビュー</strong> <strong>テキスト</strong> です。 <strong>設定</strong> を <strong>変更</strong> すると <strong>この</strong> <strong>テキスト</strong> が <strong>リアルタイ</strong>ム で <strong>更新</strong> されます。'
  };

  constructor() {
    this.intensityInputs = document.querySelectorAll('input[name="intensity"]') as NodeListOf<HTMLInputElement>;
    this.saveButton = document.getElementById('save') as HTMLButtonElement;
    this.statusDiv = document.getElementById('status') as HTMLElement;
    this.previewDiv = document.getElementById('preview') as HTMLElement;
    
    this.init();
  }

  async init(): Promise<void> {
    await this.loadSettings();
    this.setupEventListeners();
  }

  async loadSettings(): Promise<void> {
    try {
      const result = await chrome.storage.sync.get({ intensity: 2 });
      const settings = result as BionicSettings;
      
      // ラジオボタンの選択状態を設定
      this.intensityInputs.forEach(input => {
        if (parseInt(input.value) === settings.intensity) {
          input.checked = true;
          this.updateSelectedOption(input);
        }
      });
      
      // プレビューを更新
      this.updatePreview(settings.intensity);
      
    } catch (error) {
      console.error('設定の読み込みに失敗:', error);
      this.showStatus('設定の読み込みに失敗しました', 'error');
    }
  }

  setupEventListeners(): void {
    // 強度変更時のリアルタイムプレビュー
    this.intensityInputs.forEach(input => {
      input.addEventListener('change', () => {
        const intensity = parseInt(input.value);
        this.updatePreview(intensity);
        this.updateSelectedOption(input);
      });
    });

    // 保存ボタン
    this.saveButton.addEventListener('click', () => {
      this.saveSettings();
    });
  }

  updateSelectedOption(selectedInput: HTMLInputElement): void {
    // すべてのオプションからselectedクラスを削除
    document.querySelectorAll('.intensity-option').forEach(option => {
      option.classList.remove('selected');
    });
    
    // 選択されたオプションにselectedクラスを追加
    const selectedOption = selectedInput.closest('.intensity-option');
    if (selectedOption) {
      selectedOption.classList.add('selected');
    }
  }

  updatePreview(intensity: number): void {
    if (this.previewTexts[intensity]) {
      this.previewDiv.innerHTML = this.previewTexts[intensity];
    }
  }

  async saveSettings(): Promise<void> {
    try {
      const selectedInput = document.querySelector('input[name="intensity"]:checked') as HTMLInputElement;
      if (!selectedInput) {
        this.showStatus('設定を選択してください', 'error');
        return;
      }

      const intensity = parseInt(selectedInput.value);
      await chrome.storage.sync.set({ intensity });
      
      this.showStatus('✨ 設定を保存しました！', 'success');
      
    } catch (error) {
      console.error('設定の保存に失敗:', error);
      this.showStatus('設定の保存に失敗しました', 'error');
    }
  }

  showStatus(message: string, type: 'success' | 'error'): void {
    this.statusDiv.textContent = message;
    this.statusDiv.className = `status ${type} show`;
    
    // 3秒後にフェードアウト
    setTimeout(() => {
      this.statusDiv.classList.remove('show');
    }, 3000);
  }
}

// DOM読み込み完了時に初期化
document.addEventListener('DOMContentLoaded', () => {
  new OptionsController();
}); 