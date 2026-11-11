import {cmpConfig, consentCategories} from './cmp-config.mjs';

export function createConsent(preferences, now = Date.now()) {
  return {
    version: cmpConfig.version,
    necessary: true,
    ...Object.fromEntries(consentCategories.map(({id}) => [id, preferences[id] === true])),
    savedAt: now,
    expiresAt: now + cmpConfig.retentionDays * 86400000,
  };
}

export function parseConsent(raw, now = Date.now()) {
  try {
    const value = JSON.parse(raw);
    if (!value || value.version !== cmpConfig.version || value.necessary !== true
      || !Number.isFinite(value.savedAt) || !Number.isFinite(value.expiresAt)
      || value.savedAt > now || value.expiresAt <= now || value.expiresAt <= value.savedAt
      || consentCategories.some(({id}) => typeof value[id] !== 'boolean')) return null;
    // 不明な項目を公開状態へ持ち込みません。
    return {version: value.version, necessary: true,
      ...Object.fromEntries(consentCategories.map(({id}) => [id, value[id]])),
      savedAt: value.savedAt, expiresAt: value.expiresAt};
  } catch { return null; }
}

export function consentLabel(state) {
  if (!state) return '未設定';
  const count = consentCategories.filter(({id}) => state[id]).length;
  return count === 0 ? '必須のみ' : count === consentCategories.length ? 'すべて許可' : '個別設定';
}

// localStorageを利用できない環境でも、画面は利用できるようにします。
export function readConsent(getStorage = () => localStorage) {
  try { return parseConsent(getStorage().getItem(cmpConfig.storageKey)); }
  catch { return null; }
}
export function persistConsent(state, getStorage = () => localStorage) {
  try {
    const storage = getStorage();
    if (state) storage.setItem(cmpConfig.storageKey, JSON.stringify(state));
    else storage.removeItem(cmpConfig.storageKey);
    return true;
  } catch { return false; }
}
