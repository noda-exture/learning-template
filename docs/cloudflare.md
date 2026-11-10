# クローンして自分のCloudflareに公開する手順

この手順では、配布元のlearning-templateを自分のPCにクローンし、自分のCloudflareアカウントの `https://<Worker名>.<アカウントのサブドメイン>.workers.dev` で表示します。ドメイン購入やDNS設定は不要です。

GitHubは共通ソースの配布元です。公開先は各自のCloudflareアカウントです。GitHubへのpushだけで自動デプロイする設定は、この手順では行いません。

## 1. 準備

- GitとNode.js 22以上をインストールします（Node.jsはLTS版を推奨します）。
- Cloudflareアカウントを作成し、ブラウザでログインできる状態にします。
- 配布元が非公開の場合は、GitHubリポジトリへのアクセス権が必要です。

この教材はCloudflare WorkersとSQLite-backed Durable Objectsを使用します。保存先は初回デプロイ時に作成されるため、DBのIDを手動で取得する必要はありません。Freeプランでも利用できますが、利用上限は[Cloudflareの料金・制限](https://developers.cloudflare.com/durable-objects/platform/pricing/)を確認してください。

## 2. クローンする

Cloudflare対応を確認中のブランチを取得します。

```sh
git clone --branch feat/cloudflare-deployment https://github.com/noda-exture/learning-template.git my-learning-store
cd my-learning-store
npm ci
```

`my-learning-store` は自分のPC上のフォルダ名です。配布元に変更をpushする必要はありません。既にこのフォルダがある場合は別名を指定します。

## 3. 自分用の設定を作る

```sh
npm run cf:setup -- --name my-learning-store
```

`my-learning-store` はCloudflare上のWorker名で、公開URLの先頭になります。英小文字から始め、英小文字・数字・ハイフンを使います。同じCloudflareアカウントにある既存Workerと重複しない名前を選びます。同名WorkerへのデプロイはそのWorkerの更新になります。

作成される `wrangler.local.json` はGit対象外です。共通の `wrangler.json` を書き換える必要はありません。設定ファイルが既にある場合、上書きせず停止します。名前を変更する場合は、このファイルの `name` を編集します。公開後に名前を変えると別のWorker・別の保存データになるため、通常の更新では変更しません。

## 4. ローカルでCloudflare版を確認する

```sh
npm run cf:dev
```

表示された `http://localhost:8787` をブラウザで開きます。確認後はCtrl+Cで終了します。ローカルのCloudflare用データは `.wrangler/` に保存され、クラウドへはコピーされません。

従来のNode.js版は `npm run dev` で起動できます。こちらは `.data/` を使用し、Cloudflare版とは別のデータです。

## 5. Cloudflareにログインする

```sh
npm run cf:login
npm run cf:whoami
```

ブラウザが開いたら、自分のCloudflareアカウントで許可します。`cf:whoami` で公開先アカウントを確認します。複数のアカウントに所属している場合は、`wrangler.local.json` に `"account_id": "公開先のAccount ID"` を追加すると公開先を固定できます。Account IDは `cf:whoami` で確認できます。

初回にworkers.devのサブドメイン登録を求められた場合は、画面の案内に従って登録します。Cloudflare管理画面の **Workers & Pages** でも設定できます。

## 6. 公開する

```sh
npm run cf:deploy
```

成功すると公開URLが出力されます。URLをブラウザで開きます。例えばWorker名が `my-learning-store`、アカウントのサブドメインが `your-name` の場合は、次のURLになります。

```text
https://my-learning-store.your-name.workers.dev/classic/
https://my-learning-store.your-name.workers.dev/spa/
https://my-learning-store.your-name.workers.dev/lab/
```

`your-name` はCloudflare側の設定です。Worker名を変更しても、この部分は変わりません。

## 7. 公開後に確認する

1. MPA・SPAそれぞれで商品が表示されることを確認します。
2. カートに商品を入れ、デモログイン（`demo@example.test` / `demo-password`）して模擬注文を完了します。
3. 注文履歴を確認します。新規会員登録を試す場合は架空の情報と検証専用パスワードを使います。
4. 静的ページ一覧とサンプルHTMLを開きます。
5. ブラウザの開発者ツールでHTTPSとCookieのSecure属性を確認します。

デモユーザーの注文・プロフィール等は、その公開サイトにアクセスする他のデモユーザーと共有されます。この教材は実決済や個人情報の運用を想定していません。

## 8. 更新する

配布元の更新を取得する場合は、クローンしたフォルダで実行します。

```sh
git pull --ff-only
npm ci
npm run cf:deploy
```

自分で編集したファイルと競合した場合は、変更をコミットまたは退避してから取り込みます。自分用の `wrangler.local.json` は更新対象外です。

`public/lab/` にHTMLを追加した場合や `config/tags/` の共通タグを変更した場合も、`npm run cf:deploy` で反映します。ローカル版と違い、公開版はファイル保存だけでは更新されません。静的ページ一覧はデプロイ時に自動生成されます。

同じアカウント・Worker名への再デプロイでは、会員・カート・注文データが保持されます。別アカウントや別Workerのデータは独立しています。ローカルの `.data/` はアップロードされません。

## 困ったとき

| 状況 | 確認すること |
| --- | --- |
| `wrangler.local.json` が見つかりません | 手順3の `cf:setup` を実行します。 |
| 認証エラーになります | `cf:login` を再実行し、`cf:whoami` でアカウントを確認します。 |
| アカウントの選択を求められます | 自分の公開先を選びます。必要に応じて `account_id` を設定します。 |
| workers.devが使えません | Workers & Pagesでアカウントのサブドメイン登録を確認します。 |
| Node.jsのバージョンエラーになります | `node --version` を確認し、Node.js 22以上に更新します。 |
| HTMLやタグの変更が見えません | `cf:deploy` の成功と、表示中の公開URL・Worker名を確認します。 |
| 公開後のエラーを調べたいです | `npx wrangler tail --config wrangler.local.json` でログを確認します。 |

## 実装と検証範囲

Cloudflare版はWorkerがリクエストを受け、サイトごとに一つのDurable Objectが操作を直列処理してSQLiteへ保存します。保存は応答ごとのトランザクションで確定します。少人数の学習・検証向けで、大量アクセス向けの構成ではありません。

ローカル版の自動テストは `npm test`、公開用ビルドの検証は `npm run cf:check` です。Cloudflareのローカル実行環境を起動した状態で `node tests/cloudflare.integration.mjs` を実行すると、検証用会員を作成して同時注文の重複防止などを確認します。このテストの接続先はlocalhost固定です。

実装時点ではローカルのCloudflare実行環境と公開用ビルドを確認しています。実アカウントへの公開・公開URLでの確認は手順5〜7で行います。

参考：[Workers CLI](https://developers.cloudflare.com/workers/get-started/guide/)、[workers.dev](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/)、[Durable Objects](https://developers.cloudflare.com/durable-objects/)。
