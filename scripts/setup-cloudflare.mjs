import {readFile, writeFile} from 'node:fs/promises';
import {parseArgs} from 'node:util';

const {values} = parseArgs({options: {name: {type: 'string'}, account: {type: 'string'}}});
if (!values.name || !/^[a-z][a-z0-9-]{0,62}$/.test(values.name)) {
  throw new Error('npm run cf:setup -- --name my-learning-store の形式で、英小文字から始まる英小文字・数字・ハイフンのWorker名（63文字以内）を指定してください。');
}
if (values.account && !/^[a-f0-9]{32}$/i.test(values.account)) throw new Error('accountには32桁のCloudflare Account IDを指定してください。');
const config = JSON.parse(await readFile(new URL('../wrangler.json', import.meta.url), 'utf8'));
config.name = values.name;
if (values.account) config.account_id = values.account;
await writeFile(new URL('../wrangler.local.json', import.meta.url), JSON.stringify(config, null, 2) + '\n', {flag: 'wx'});
console.log('自分用のwrangler.local.jsonを作成しました（Git対象外）。既存の同名Workerがないことを確認し、npm run cf:deploy で公開します。');
