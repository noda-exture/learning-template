import {DurableObject} from 'cloudflare:workers';
import {makeApp} from './app.mjs';
import pages from '../.generated/pages.json';
import head from '../config/tags/head.html';
import bodyStart from '../config/tags/body-start.html';

// 一つの教材サイトの操作を直列化し、会員共有データの更新競合を防ぎます。
// アカウント・Workerが異なるデプロイ間ではデータを共有しません。
export class LearningStore extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.queue = Promise.resolve();
    ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS records (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
  }

  fetch(request) {
    const result = this.queue.then(() => this.handle(request));
    this.queue = result.catch(() => {});
    return result;
  }

  async handle(request) {
    const pending = new Map();
    const sql = this.ctx.storage.sql;
    const store = {
      get: async key => {
        if (pending.has(key)) return structuredClone(pending.get(key));
        const rows = sql.exec('SELECT value FROM records WHERE key = ?', key).toArray();
        return rows.length ? JSON.parse(rows[0].value) : undefined;
      },
      set: async (key, value) => { pending.set(key, structuredClone(value)); },
    };
    const assets = async path => {
      const response = await this.env.ASSETS.fetch(new Request(new URL(path, request.url)));
      if (response.status !== 200) return null;
      return {body: await response.arrayBuffer(), type: response.headers.get('content-type') || 'application/octet-stream'};
    };
    const response = await makeApp(store, assets, async () => pages, async () => ({head, bodyStart}))(request);
    // エラー応答では途中の更新を保存しません。検証用500/503も同じ扱いです。
    if (response.status < 500) {
      this.ctx.storage.transactionSync(() => {
        for (const [key, value] of pending) {
          if (value === null) sql.exec('DELETE FROM records WHERE key = ?', key);
          else sql.exec('INSERT INTO records (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', key, JSON.stringify(value));
        }
      });
    }
    return response;
  }
}

export default {
  async fetch(request, env) {
    // ローカル版と同じ上限を適用し、DOへ大きな入力を渡さないようにします。
    if (request.body) {
      const reader = request.body.getReader();
      const chunks = [];
      let size = 0;
      while (true) {
        const {done, value} = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 65536) {
          await reader.cancel();
          return new Response('Request too large', {status: 413});
        }
        chunks.push(value);
      }
      request = new Request(request, {body: new Blob(chunks)});
    }
    return env.STORE.get(env.STORE.idFromName('site-v1')).fetch(request);
  },
};
