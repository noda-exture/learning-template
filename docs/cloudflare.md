# クローンして自分のCloudflareに公開する手順

この手順では、配布元のlearning-templateを自分のPCにクローンし、自分のCloudflareアカウントの `https://<Worker名>.<アカウントのサブドメイン>.workers.dev` で表示します。ドメイン購入やDNS設定は不要です。

GitHubは共通ソースの配布元です。公開先は各自のCloudflareアカウントです。GitHubへのpushだけで自動デプロイする設定は、この手順では行いません。

## 1. 準備

- GitHubアカウントとCloudflareアカウントを用意します。未登録の場合は、[GitHub](https://github.com/)と[Cloudflare](https://dash.cloudflare.com/sign-up)で作成します。
- GitHubで配布元のリポジトリを開けることと、Cloudflareにブラウザでログインできることを確認します。
- GitとNode.js 22以上をインストールします（Node.jsはLTS版を推奨します）。
- 配布元が非公開の場合は、GitHubリポジトリへのアクセス権が必要です。

この教材はCloudflare WorkersとSQLite-backed Durable Objectsを使用します。保存先は初回デプロイ時に作成されるため、DBのIDを手動で取得する必要はありません。Freeプランでも利用できますが、利用上限は[Cloudflareの料金・制限](https://developers.cloudflare.com/durable-objects/platform/pricing/)を確認してください。

## 2. クローンする

まずターミナルを開き、**プロジェクトのフォルダを作りたい場所（親フォルダ）へ移動します**。例えば「ドキュメント」内に作る場合は、次を実行します。

macOSの場合：

```sh
cd ~/Documents
```

Windows（PowerShell）の場合：

```powershell
cd ([Environment]::GetFolderPath('MyDocuments'))
```

別の場所に作る場合は、`cd "作成先の親フォルダのパス"` で移動します。移動後、次を順番に実行してCloudflare対応を確認中のブランチを取得します。

```sh
git clone --branch feat/cloudflare-deployment https://github.com/noda-exture/learning-template.git my-learning-store
cd my-learning-store
npm ci
```

`git clone` によって、移動先の中に `my-learning-store` フォルダが新しく作られます。先に同名フォルダを作る必要はありません。`cd my-learning-store` は、作成されたプロジェクトの中へ移動するコマンドです。**以降のコマンドは、このプロジェクトのフォルダ内で実行します。**

`my-learning-store` は自分のPC上のフォルダ名です。配布元に変更をpushする必要はありません。既にこのフォルダがある場合は、`git clone` の末尾と、その次の `cd` に同じ別名を指定します。

## 3. 自分用の設定を作る

```sh
npm run cf:setup -- --name my-learning-store
```

`my-learning-store` はCloudflare上のWorker名で、公開URLの先頭になります。英小文字から始め、英小文字・数字・ハイフンを使います。同じCloudflareアカウントにある既存Workerと重複しない名前を選びます。同名WorkerへのデプロイはそのWorkerの更新になります。

作成される `wrangler.local.json` は、プロジェクト直下（`package.json` と同じ場所）にあり、Git対象外です。共通の `wrangler.json` を書き換える必要はありません。設定ファイルが既にある場合、上書きせず停止します。

Worker名を変更する場合は、エディタで **`wrangler.local.json` の3行目**を開きます。生成直後は次の行になっています。

```json
  "name": "my-learning-store",
```

右側の `my-learning-store` だけを希望の名前に変更して保存します。引用符と末尾のカンマは残します。自分で行を追加した場合は行番号がずれるため、`"name"` を検索してください。手順3のコマンドで希望の名前を指定済みなら、編集は不要です。

公開後に名前を変えると別のWorker・別の保存データになるため、通常の更新では変更しません。

## 4. ローカルでCloudflare版を確認する

```sh
npm run cf:dev
```

表示された `http://localhost:8787` をブラウザで開きます。確認後はCtrl+Cで終了します。ローカルのCloudflare用データは `.wrangler/` に保存され、クラウドへはコピーされません。

従来のNode.js版は `npm run dev` で起動できます。こちらは `.data/` を使用し、Cloudflare版とは別のデータです。

## 5. Cloudflareにログインする

```sh
npm run cf:login
```

ブラウザが開いたら、自分のCloudflareアカウントでログインし、Wranglerへの権限付与を許可します。

**「Authorization granted to Wrangler」と表示されたら、ログイン・権限付与は成功です。そのブラウザのタブ（またはウィンドウ）は閉じて大丈夫です。** 画面内の「Copy prompt」を押す必要はありません。

ターミナルに戻り、ログイン処理が完了してコマンドを入力できる状態になったら、次を実行します。

```sh
npm run cf:whoami
```

表示された公開先が自分のCloudflareアカウントであることを確認し、手順6へ進みます。複数のアカウントに所属している場合は、`wrangler.local.json` に `"account_id": "公開先のAccount ID"` を追加すると公開先を固定できます。Account IDは `cf:whoami` で確認できます。

## 6. 公開する

```sh
npm run cf:deploy
```

### 初回にサブドメイン登録を聞かれた場合

アカウントのworkers.devサブドメインが未登録の場合、次の質問が表示されます。既に登録済みの場合、この操作は不要です。

```text
Would you like to register a workers.dev subdomain now?
```

これは「workers.devのサブドメインを今登録しますか？」という意味です。**`Y` を入力してEnterを押します。**

続けて、使いたいサブドメインの名前を聞かれます。

```text
What would you like your workers.dev subdomain to be?
It will be accessible at https://<subdomain>.workers.dev
```

ここには **`workers.dev` の直前に入る名前だけ**を入力してEnterを押します。例えば次のように入力します。

```text
noda-learning
```

**他の人が既に登録している名前は使えません。** `Subdomain is unavailable, please try a different subdomain` と表示された場合は、数字や別の単語を足して、別の名前を入力します（例：`noda-learning-2026`）。これらの例も使用できるとは限らないため、登録できる名前を選びます。

ドットやURL全体は入力しません。`my-learning-store.noda` や `my-learning-store.noda.workers.dev` と入力すると、`invalid`（無効）になります。

Worker名が `my-learning-store`、ここで登録した名前が `noda-learning` の場合、公開URLは次の形になります。

```text
https://my-learning-store.noda-learning.workers.dev
```

先頭の `my-learning-store` は `wrangler.local.json` のWorker名から自動で付くため、この入力欄には含めません。

**JSONの `name` と、ここで登録するサブドメインは別の設定です。一致させる必要はありません。** 公開URLの各部分は次のように決まります。

```text
https://<JSONのname>.<登録したサブドメイン>.workers.dev
```

`https://noda-learning.workers.dev` のようにアカウントのサブドメインだけで開いても、このサイトの公開URLにはなりません。必ずWorker名を含むURLを使います。

### 名前の入力でエラーになった場合・Worker名を変更したい場合

| 状況 | 対処 |
| --- | --- |
| サブドメインが `unavailable` と表示されます | 使用済みです。その入力欄で別の名前を指定します。JSONの `name` を変更しても、このエラーは解消しません。 |
| サブドメインが `invalid` と表示されます | ドットや `workers.dev` を含めず、`noda-learning` のような名前だけを入力し直します。 |
| Worker名の形式に関するエラーが出ます・公開URLの先頭を変更したいです | `wrangler.local.json` の3行目の `name` を修正して保存し、下記のコマンドで再デプロイします。 |

Worker名を修正した場合は、プロジェクトのフォルダで次を実行します。

```sh
npm run cf:deploy
```

このコマンドでビルドとデプロイを実行するため、別途ビルドコマンドを実行する必要はありません。**デプロイの成功を確認してから、出力された新しいURLを開きます。** 公開済みのWorker名を変更すると別のWorkerになり、以前のデータは引き継がれず、以前のWorkerも残ります。

### 公開URLを開く

成功すると公開URLが出力されます。**ターミナルに表示されたURLをそのまま開いてください。** 初回公開直後に接続できない場合は、反映待ちの可能性もあるため、数秒〜数分待って再度アクセスします。これは待ち時間の目安であり、コマンドがエラーで終了した場合は、待つだけでは公開されません。エラー内容を確認して対処します。

数分待っても開けない場合は、URLの綴り、JSONの `name`、登録したサブドメイン、デプロイの成功を確認してください。例えばWorker名が `my-learning-store`、アカウントのサブドメインが `your-name` の場合は、次のURLになります。

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
