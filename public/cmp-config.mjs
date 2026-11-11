// 画面と同意状態の保存のみを行う学習用CMPです。タグ制御は別途実装します。
export const cmpConfig = {
  enabled: true,
  storageKey: 'exture_consent_v1',
  version: 1,
  retentionDays: 180,
};

export const consentCategories = [
  {id: 'analytics', label: 'アクセス解析', description: 'ページの閲覧や操作を分析する用途の同意設定です。'},
  {id: 'marketing', label: '広告', description: '広告の効果測定や配信に利用する用途の同意設定です。'},
  {id: 'personalization', label: 'パーソナライズ', description: '好みに合わせて表示内容を調整する用途の同意設定です。'},
];
