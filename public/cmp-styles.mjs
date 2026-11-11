export const cmpStyles = `
:host{font-family:-apple-system,BlinkMacSystemFont,"Hiragino Kaku Gothic ProN","Noto Sans JP",sans-serif;font-size:14px;line-height:1.7;color:#29352e;color-scheme:light}
*{box-sizing:border-box} [hidden]{display:none!important}
button,input{font:inherit}button{cursor:pointer}button:focus-visible,input:focus-visible{outline:3px solid #b16a36;outline-offset:3px}
button{border:1px solid #7b897c;border-radius:5px;padding:11px 16px;background:#fff;color:#29352e;min-height:44px;font-weight:600}
button:hover{background:#edf1e8}button:disabled{cursor:default}p{margin:8px 0}h2{font-size:20px;margin:0;line-height:1.5}h3{font-size:15px;margin:0}
.banner{position:fixed;z-index:2147483000;bottom:24px;left:24px;right:24px;max-width:1020px;margin:auto;padding:24px;background:#faf9f5;border:1px solid #c5cabc;border-radius:12px;box-shadow:0 8px 36px #15261926;display:grid;grid-template-columns:1fr auto;gap:22px;align-items:center}
.eyebrow{display:block;color:#5a685a;font-size:10px;letter-spacing:.12em;margin-bottom:6px}
.description{font-size:13px}.demo-note{font-size:12px;color:#67583d;background:#f0ebdf;border-radius:5px;padding:10px 12px}
.actions{display:flex;gap:8px;flex-wrap:wrap}.banner .actions{max-width:330px;justify-content:flex-end}.banner .actions button{flex:1 1 140px;white-space:nowrap}
.launcher{position:fixed;bottom:16px;left:16px;z-index:2147482999;box-shadow:0 2px 14px #15261920;font-size:12px;padding:8px 13px;display:flex;gap:10px;align-items:center}
.badge{background:#edf1e8;border-radius:3px;padding:2px 7px;font-size:11px;font-weight:400}
dialog{color:#29352e;background:#faf9f5;border:1px solid #c5cabc;border-radius:12px;padding:0;width:min(600px,calc(100vw - 32px));max-height:calc(100dvh - 40px);overflow:auto;box-shadow:0 15px 60px #0003}
dialog::backdrop{background:#14201980}.dialog-content{padding:28px}.dialog-header{display:flex;align-items:center;justify-content:space-between;gap:20px}.close{padding:5px 13px;font-size:22px;font-weight:400}
.status{font-size:12px;color:#536152;border-bottom:1px solid #dce0d5;padding-bottom:16px;margin-bottom:0}
.category{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;padding:18px 0;border-bottom:1px solid #dce0d5}.category p{font-size:12px;color:#637060;margin-bottom:0}.choice{display:flex;align-items:center;gap:8px;white-space:nowrap;font-size:12px;padding-top:2px}.choice input{width:20px;height:20px;accent-color:#314c3c}
.dialog-actions{margin-top:22px;display:grid;grid-template-columns:1fr 1fr;gap:10px}.save{grid-column:1/-1;background:#314c3c;color:#fff;border-color:#314c3c}.save:hover{background:#47614e}
.testing{margin-top:22px;border-top:1px solid #dce0d5;padding-top:14px}.testing summary{cursor:pointer;font-size:12px}.testing p{font-size:12px}.reset{font-size:12px;margin-top:8px}
.feedback{position:fixed;bottom:75px;left:16px;z-index:2147483001;background:#29352e;color:#fff;border-radius:6px;padding:12px 16px;max-width:min(440px,calc(100vw - 32px));box-shadow:0 2px 12px #0002;font-size:12px}.feedback:empty{display:none}.feedback button{font-size:11px;margin-top:8px;padding:4px 12px;min-height:32px}
@media(max-width:760px){.banner{left:12px;right:12px;bottom:12px;padding:18px;grid-template-columns:1fr;gap:12px;max-height:calc(100dvh - 24px);overflow:auto}.banner .actions{max-width:none;justify-content:stretch}.banner .actions button{flex:1 1 120px}.dialog-content{padding:20px}h2{font-size:18px}.category{gap:12px}}
`;
