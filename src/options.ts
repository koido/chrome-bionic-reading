/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

interface BionicSettings {
  intensity: number; // 0=なし, 1=弱め, 2=やや弱め, 3=普通, 4=やや強め, 5=強め
  lineHeight: number;
}

class OptionsController {
  private intensityInputs: NodeListOf<HTMLInputElement>;
  private lineHeightInput: HTMLInputElement;
  private saveButton: HTMLButtonElement;
  private statusDiv: HTMLElement;
  private previewDiv: HTMLElement;
  
  private readonly previewTexts: { [key: number]: string } = {
    0: 'これは Reading Aid のプレビューテキストです。設定を変更するとこのテキストがリアルタイムで更新されます。',
    1: 'これは <strong>R</strong>eading <strong>A</strong>id の <strong>プ</strong>レビュー <strong>テ</strong>キスト です。 <strong>設</strong>定 を <strong>変</strong>更 すると <strong>こ</strong>の <strong>テ</strong>キスト が <strong>リ</strong>アルタイム で <strong>更</strong>新 されます。',
    2: 'これは <strong>Re</strong>ading <strong>Ai</strong>d の <strong>プレ</strong>ビュー <strong>テキ</strong>スト です。 <strong>設定</strong> を <strong>変更</strong> すると <strong>この</strong> <strong>テキ</strong>スト が <strong>リア</strong>ルタイム で <strong>更新</strong> されます。',
    3: 'これは <strong>Rea</strong>ding <strong>Aid</strong> の <strong>プレビ</strong>ュー <strong>テキス</strong>ト です。 <strong>設定</strong> を <strong>変更</strong> すると <strong>この</strong> <strong>テキス</strong>ト が <strong>リアル</strong>タイム で <strong>更新</strong> されます。',
    4: 'これは <strong>Read</strong>ing <strong>Aid</strong> の <strong>プレビュ</strong>ー <strong>テキスト</strong> です。 <strong>設定</strong> を <strong>変更</strong> すると <strong>この</strong> <strong>テキスト</strong> が <strong>リアルタ</strong>イム で <strong>更新</strong> されます。',
    5: 'これは <strong>Readi</strong>ng <strong>Aid</strong> の <strong>プレビュー</strong> <strong>テキスト</strong> です。 <strong>設定</strong> を <strong>変更</strong> すると <strong>この</strong> <strong>テキスト</strong> が <strong>リアルタイ</strong>ム で <strong>更新</strong> されます。'
  };

  constructor() {
    this.intensityInputs = document.querySelectorAll('input[name="intensity"]') as NodeListOf<HTMLInputElement>;
    this.lineHeightInput = document.getElementById('line-height') as HTMLInputElement;
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
      const result = await chrome.storage.sync.get({ intensity: 2, lineHeight: 1.6 });
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
      
      // lineHeight
      this.lineHeightInput.value = settings.lineHeight.toString();
      document.getElementById('lh-val')!.textContent = settings.lineHeight.toString();
      this.previewDiv.style.lineHeight = settings.lineHeight.toString();
      
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

    // lineHeight
    this.lineHeightInput.addEventListener('input', () => {
      const lh = parseFloat(this.lineHeightInput.value);
      if (!isNaN(lh)) {
        document.getElementById('lh-val')!.textContent = lh.toString();
        this.previewDiv.style.lineHeight = lh.toString();
      } else {
        // 無効な値の場合はプレビューを更新しない
        document.getElementById('lh-val')!.textContent = '—';
      }
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
      const lineHeight = parseFloat(this.lineHeightInput.value);
      if (isNaN(lineHeight)) {
        this.showStatus('行間の値が不正です', 'error');
        return;
      }
      await chrome.storage.sync.set({ intensity, lineHeight });
      
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