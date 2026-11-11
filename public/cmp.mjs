import {cmpConfig, consentCategories} from './cmp-config.mjs';
import {createConsent, readConsent, persistConsent, consentLabel, parseConsent} from './consent-state.mjs';
import {cmpStyles} from './cmp-styles.mjs';

if (cmpConfig.enabled && !document.querySelector('[data-exture-cmp-root]')) {
  const host = document.createElement('div');
  host.setAttribute('data-exture-cmp-root', '');
  const root = host.attachShadow({mode: 'open'});
  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const note = '学習用の同意設定です。選択内容は保存されますが、タグの送信やCookieの発行はまだ制御されません。';
  root.innerHTML = `<style>${cmpStyles}</style>
    <section class="banner" role="region" aria-labelledby="banner-title" hidden>
      <div><span class="eyebrow">EXTURE STORE · PRIVACY</span><h2 id="banner-title">Cookieの同意設定</h2>
      <p class="description">アクセス解析・広告などの利用目的ごとに、同意内容を選択できます。設定はいつでも変更できます。</p><p class="demo-note">${note}</p></div>
      <div class="actions"><button type="button" data-action="accept">すべて許可</button><button type="button" data-action="reject">必須のみ許可</button><button type="button" data-action="open">個別に設定</button></div>
    </section>
    <button type="button" class="launcher" data-action="open" hidden>同意設定<span class="badge"></span></button>
    <dialog aria-labelledby="settings-title" aria-describedby="settings-note">
      <div class="dialog-content"><div class="dialog-header"><h2 id="settings-title">同意設定</h2><button class="close" type="button" data-action="close" aria-label="同意設定を閉じる" autofocus>×</button></div>
      <p class="demo-note" id="settings-note">${note}</p><p class="status"></p>
      <div class="category"><div><h3>必須</h3><p>ログインやカートなど、サイトの基本機能に必要な用途です。</p></div><label class="choice"><input type="checkbox" checked disabled>常に有効</label></div>
      ${consentCategories.map(c => `<div class="category"><div><h3 id="label-${esc(c.id)}">${esc(c.label)}</h3><p id="desc-${esc(c.id)}">${esc(c.description)}</p></div><label class="choice"><input type="checkbox" name="${esc(c.id)}" aria-labelledby="label-${esc(c.id)}" aria-describedby="desc-${esc(c.id)}">許可</label></div>`).join('')}
      <div class="dialog-actions"><button type="button" data-action="accept">すべて許可</button><button type="button" data-action="reject">必須のみ許可</button><button type="button" class="save" data-action="save">この設定を保存</button></div>
      <details class="testing"><summary>検証用の操作</summary><p>このサイトの同意設定だけを初期状態に戻します。ログインやカートの情報は削除しません。</p><button type="button" class="reset" data-action="reset">同意設定をリセット</button></details></div>
    </dialog>
    <div class="feedback" role="status" aria-live="polite"></div>`;
  document.body.append(host);

  const banner = root.querySelector('.banner');
  const launcher = root.querySelector('.launcher');
  const dialog = root.querySelector('dialog');
  const feedback = root.querySelector('.feedback');
  let state = readConsent();
  let persisted = true;
  let feedbackTimer;
  const snapshot = () => state ? structuredClone(state) : null;
  function render() {
    banner.hidden = !!state || dialog.open;
    launcher.hidden = !state || dialog.open;
    root.querySelector('.badge').textContent = consentLabel(state);
    root.querySelector('.status').textContent = state
      ? `現在：${consentLabel(state)} ｜ ${new Date(state.savedAt).toLocaleString('ja-JP')}${persisted ? '' : '（このページのみ）'}`
      : '現在：未設定（任意の項目はすべてオフ）';
    for (const {id} of consentCategories) root.querySelector(`input[name="${id}"]`).checked = state?.[id] === true;
  }
  function announce(message, permanent = false) {
    clearTimeout(feedbackTimer);
    feedback.replaceChildren(document.createTextNode(message));
    if (permanent) {
      const dismiss = document.createElement('button');
      dismiss.textContent = '閉じる';
      dismiss.addEventListener('click', () => feedback.replaceChildren());
      feedback.append(document.createElement('br'), dismiss);
    } else feedbackTimer = setTimeout(() => feedback.replaceChildren(), 5000);
  }
  function notify(action) {
    window.dispatchEvent(new CustomEvent('exture:consent-change', {detail: {action, consent: snapshot(), persisted}}));
  }
  function save(preferences) {
    state = createConsent(preferences);
    persisted = persistConsent(state);
    if (dialog.open) dialog.close();
    render();
    launcher.focus();
    announce(persisted ? `同意設定を保存しました：${consentLabel(state)}` : 'ブラウザに保存できませんでした。このページ内のみ有効です。再読み込みすると以前の設定または未設定に戻ります。', !persisted);
    notify('save');
  }
  function reset() {
    persisted = persistConsent(null);
    state = null;
    if (dialog.open) dialog.close();
    render();
    banner.querySelector('button').focus();
    announce(persisted ? '同意設定をリセットしました。初回の選択を再検証できます。' : '保存済みの設定を削除できませんでした。再読み込みすると以前の設定が戻る可能性があります。', !persisted);
    notify('reset');
  }
  root.addEventListener('click', event => {
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action === 'open') { render(); dialog.showModal(); banner.hidden = true; launcher.hidden = true; }
    if (action === 'close') dialog.close();
    if (action === 'accept' || action === 'reject') save(Object.fromEntries(consentCategories.map(({id}) => [id, action === 'accept'])));
    if (action === 'save') save(Object.fromEntries(consentCategories.map(({id}) => [id, root.querySelector(`input[name="${id}"]`).checked])));
    if (action === 'reset') reset();
  });
  dialog.addEventListener('close', render);
  window.addEventListener('storage', event => {
    if (event.key !== cmpConfig.storageKey && event.key !== null) return;
    state = readConsent(); persisted = true; render();
    announce('別のタブの同意設定を反映しました。'); notify('sync');
  });
  function refresh() {
    if (state && !parseConsent(JSON.stringify(state))) {
      state = null; render(); notify('expire');
    }
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
  window.addEventListener('pageshow', refresh);
  window.extureConsent = Object.freeze({getState: snapshot, open: () => {
    render(); if (!dialog.open) dialog.showModal(); banner.hidden = true; launcher.hidden = true;
  }});
  render();
}
