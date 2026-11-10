# クローンして自分のCloudflareに公開する手順

この手順では、配布元のlearning-templateを自分のPCにクローンし、自分のCloudflareアカウントの `https://<Worker名>.<アカウントのサブドメイン>.workers.dev` で表示します。ドメイン購入やDNS設定は不要です。

GitHubは共通ソースの配布元です。公開先は各自のCloudflareアカウントです。GitHubへのpushだけで自動デプロイする設定は、この手順では行いません。

## この手順の読み方

初回は手順1〜7を順番に進めます。導入後の編集・更新は、別の[公開後のカスタマイズ・更新手順](customization.md)を使います。

- コマンドはターミナルに1行ずつ貼り付け、Enterを押して実行します。処理が終わり、次のコマンドを入力できる状態になってから進みます。
- エラーで止まった場合は、後続のコマンドを続けず、末尾の「困ったとき」で該当する対処を確認します。
- この手順の `my-learning-store` は例です。そのまま使っても構いません。アカウントのサブドメインの例 `haru-learning` は、登録時に自分の希望名へ置き換えます。
- GitHub上では[この手順書の最新版](https://github.com/noda-exture/learning-template/blob/feat/cloudflare-deployment/docs/cloudflare.md)を開いてください。URLにコミット番号が入っているページは更新されません。

先に、3種類の名前を区別します。

| 名前 | この手順の例 | 決める場所・役割 |
| --- | --- | --- |
| PC上のフォルダ名 | `my-learning-store` | 手順2の `git clone` の末尾です。PC内の保存場所で、公開URLには影響しません。 |
| Worker名 | `my-learning-store` | 手順3で設定します。`wrangler.local.json` の `name` に保存され、公開URLの先頭になります。 |
| アカウントのサブドメイン | `haru-learning` | 手順6で登録します。Worker名の後ろ、`workers.dev` の前になります。 |

**これらの名前は一致させる必要がありません。** 上の例での完成URLは `https://my-learning-store.haru-learning.workers.dev` です。これは説明用の例なので、実際には公開成功時に表示されたURLを開きます。

## 1. 準備

### アカウントとソフトを用意する

| 用意するもの | 準備すること |
| --- | --- |
| GitHubアカウント | [GitHub](https://github.com/)で登録・ログインし、[配布元リポジトリ](https://github.com/noda-exture/learning-template)が開けるか確認します。非公開の場合は配布元の管理者からアクセス権をもらいます。 |
| Cloudflareアカウント | [Cloudflare](https://dash.cloudflare.com/sign-up)で登録し、ブラウザでログインできる状態にします。 |
| Git | [公式ダウンロードページ](https://git-scm.com/downloads)から自分のOS向けにインストールします。 |
| Node.jsとnpm | [Node.js公式サイト](https://nodejs.org/)からLTS版をインストールします。この教材はNode.js 22以上が必要です。npmはNode.jsと一緒にインストールされます。 |
| テキストエディタ | 設定変更時にJSONファイルを開いて保存できるものを用意します。 |

この手順はmacOSとWindowsを対象にしています。CloudflareのCLI（Wrangler）の対応OSはmacOS 13.5以降・Windows 11です。詳しくは[公式の動作要件](https://developers.cloudflare.com/workers/wrangler/install-and-update/)を確認してください。

### ターミナルを開き、インストールを確認する

macOSはアプリの「ターミナル」、Windowsは「PowerShell」を開きます。ソフトをインストールした直後なら、ターミナルを一度閉じて開き直します。

次を1行ずつ実行します。

```sh
git --version
node --version
npm --version
```

**成功の目印：** すべてにバージョン番号が表示され、Node.jsが `v22` 以上になっていることです。`command not found` や「認識されません」が出る場合は、該当ソフトのインストールを確認します。Windowsで `npm.ps1` の実行が禁止されている場合は、以降の `npm` を `npm.cmd` に置き換えます。

Wranglerは手順2の `npm ci` でプロジェクトに入るため、別途インストールする必要はありません。

この教材はCloudflare WorkersとSQLite-backed Durable Objectsを使用します。保存先は初回デプロイ時に自動作成します。Freeプランでも利用できますが、[利用上限・料金](https://developers.cloudflare.com/durable-objects/platform/pricing/)を確認してください。公開URLを知っている人がアクセスできる学習用サイトになります。実際の個人情報や普段使うパスワードは入力しません。

## 2. クローンする

「クローン」は、GitHubのソース一式を自分のPCへコピーする操作です。GitHubに自分用のリポジトリを作成する必要はありません。

### 2-1. 作成先の親フォルダへ移動する

**プロジェクトのフォルダを作りたい場所へ、ターミナルで移動します。** 「ドキュメント」内に作る場合は、自分のOSのコマンドだけを実行します。

macOSの場合：

```sh
cd ~/Documents
```

Windows（PowerShell）の場合：

```powershell
cd ([Environment]::GetFolderPath('MyDocuments'))
```

別の場所を使う場合は、既に存在する親フォルダのパスを指定して `cd "作成先の親フォルダのパス"` を実行します。引用符の中は実際のパスに置き換えます。

次のコマンドは両OSで使えます。表示される現在地が、作成したい場所か確認します。

```sh
pwd
```

### 2-2. ソースを取得する

```sh
git clone --branch feat/cloudflare-deployment https://github.com/noda-exture/learning-template.git my-learning-store
```

Cloudflare対応は現在 `feat/cloudflare-deployment` ブランチにあるため、`--branch` の指定を省略しません。

`git clone` によって、現在地の中に `my-learning-store` フォルダが作成されます。先に同名フォルダを作る必要はありません。既に同名フォルダがある場合は、このコマンドの末尾と次の `cd` に同じ別名を指定します。途中でGitHubのログイン画面が出たら、リポジトリへアクセスできるアカウントで認証します。

**成功の目印：** エラーなくコマンドが終了し、`my-learning-store` フォルダが作られることです。`Repository not found` や認証エラーが出た場合は、「困ったとき」のGitHub認証を確認してから再実行します。

### 2-3. プロジェクトへ移動し、必要なソフトを入れる

```sh
cd my-learning-store
```

次を実行し、一覧に `package.json` と `wrangler.json` があることを確認します。

```sh
ls
```

続けて実行します。

```sh
npm ci
```

ダウンロードが終わるまで待ちます。**成功の目印：** エラーなく処理が終わり、次のコマンドを入力できる状態になることです。`npm ci` はファイルを取得するだけで、サイトはまだ公開しません。

**以降のコマンドは、このプロジェクトのフォルダ内で実行します。** ターミナルを開き直したときは、`cd "プロジェクトのフォルダの絶対パス"` で戻り、`ls` で `package.json` が見えることを確認してから再開します。

## 3. 自分用の設定を作る

まず、Cloudflare上のサイト名（Worker名）を決めます。以下は `my-learning-store` で作る例です。変更する場合はコマンド末尾の名前を置き換えます。

```sh
npm run cf:setup -- --name my-learning-store
```

`my-learning-store` はCloudflare上のWorker名で、公開URLの先頭になります。英小文字から始め、英小文字・数字・ハイフンで63文字以内にします。空白・ドット・日本語は使いません。同じCloudflareアカウントにある既存Workerと重複しない名前を選びます。同名WorkerへのデプロイはそのWorkerの更新になります。

作成される `wrangler.local.json` は、プロジェクト直下（`package.json` と同じ場所）にあり、Git対象外です。共通の `wrangler.json` を書き換える必要はありません。**成功の目印：** 「自分用のwrangler.local.jsonを作成しました」と表示されることです。設定ファイルが既にある場合は `EEXIST` で停止します。これは上書きを防ぐためなので、既存設定の名前を確認し、正しければ手順4へ進みます。

Worker名を変更する場合は、エディタで **`wrangler.local.json` の3行目**を開きます。生成直後は次の行になっています。

```json
  "name": "my-learning-store",
```

右側の `my-learning-store` だけを希望の名前に変更して保存します。引用符と末尾のカンマは残します。自分で行を追加した場合は行番号がずれるため、`"name"` を検索してください。手順3のコマンドで希望の名前を指定済みなら、編集は不要です。

公開後に名前を変えると別のWorker・別の保存データになるため、通常の更新では変更しません。

## 4. ローカルでCloudflare版を確認する

「ローカル」は自分のPC内という意味です。この段階ではインターネットには公開されません。

```sh
npm run cf:dev
```

ターミナルに `Ready on http://localhost:8787` のようなURLが表示されたら、そのURLをブラウザで開きます。ポート番号が異なる場合は、実際に表示されたURLを使います。

**成功の目印：** 商品が並ぶECサイトが表示されることです。起動中はターミナルが待機したままになりますが、正常です。

確認後はブラウザではなく、**サーバーを起動したターミナルを選んでCtrl+Cを押します**（macOSでもCommand+Cではありません）。次のコマンドを入力できる状態になったら手順5へ進みます。ローカルのCloudflare用データは `.wrangler/` に保存され、クラウドへはコピーされません。

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

**成功の目印：** 自分のアカウント情報が表示されることです。`You are not authenticated` と表示された場合は `npm run cf:login` をやり直します。GitHubとは別のログインなので、公開したいCloudflareアカウントか確認します。

所属アカウントが一つなら手順6へ進みます。複数ある場合は、`cf:whoami` の一覧から公開先の **Account ID** を確認し、`wrangler.local.json` の `name` の次に `account_id` を1行追加して保存します。ファイル先頭は次の形になります（抜粋です。ファイル全体を置き換えないでください）。

```text
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "my-learning-store",
  "account_id": "ここを公開先の32桁のAccount IDに置き換えます",
  "main": "src/worker.mjs",
```

`name` とAccount IDは自分の値を使います。追加行の末尾のカンマも必要です。Account IDはAPIトークンやパスワードではありません。

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
haru-learning
```

**他の人が既に登録している名前は使えません。** `Subdomain is unavailable, please try a different subdomain` と表示された場合は、数字や別の単語を足して、別の名前を入力します（例：`haru-learning-2026`）。これらの例も使用できるとは限らないため、登録できる名前を選びます。

ドットやURL全体は入力しません。`my-learning-store.haru` や `my-learning-store.haru.workers.dev` と入力すると、`invalid`（無効）になります。

Worker名が `my-learning-store`、ここで登録した名前が `haru-learning` の場合、公開URLは次の形になります。

```text
https://my-learning-store.haru-learning.workers.dev
```

先頭の `my-learning-store` は `wrangler.local.json` のWorker名から自動で付くため、この入力欄には含めません。

**JSONの `name` と、ここで登録するサブドメインは別の設定です。一致させる必要はありません。** 公開URLの各部分は次のように決まります。

```text
https://<JSONのname>.<登録したサブドメイン>.workers.dev
```

`https://haru-learning.workers.dev` のようにアカウントのサブドメインだけで開いても、このサイトの公開URLにはなりません。必ずWorker名を含むURLを使います。

### 名前の入力でエラーになった場合・Worker名を変更したい場合

| 状況 | 対処 |
| --- | --- |
| サブドメインが `unavailable` と表示されます | 使用済みです。その入力欄で別の名前を指定します。JSONの `name` を変更しても、このエラーは解消しません。 |
| サブドメインが `invalid` と表示されます | ドットや `workers.dev` を含めず、`haru-learning` のような名前だけを入力し直します。 |
| Worker名の形式に関するエラーが出ます・公開URLの先頭を変更したいです | `wrangler.local.json` の3行目の `name` を修正して保存し、下記のコマンドで再デプロイします。 |

Worker名を修正した場合は、プロジェクトのフォルダで次を実行します。

```sh
npm run cf:deploy
```

このコマンドでビルドとデプロイを実行するため、別途ビルドコマンドを実行する必要はありません。**デプロイの成功を確認してから、出力された新しいURLを開きます。** 公開済みのWorker名を変更すると別のWorkerになり、以前のデータは引き継がれず、以前のWorkerも残ります。

### 公開URLを開く

**成功の目印：** デプロイ完了の表示（`Deployed` など）と `https://…workers.dev` の公開URLが出て、エラーなくコマンドが終了することです。アセットのアップロード完了だけで判断せず、最後まで待ちます。

**ターミナルに表示された公開URLをそのままコピーし、ブラウザのアドレス欄に貼り付けて開いてください。** 初回公開直後に接続できない場合は、反映待ちの可能性もあるため、数秒〜数分待って再度アクセスします。これは待ち時間の目安であり、コマンドがエラーで終了した場合は、待つだけでは公開されません。エラー内容を確認して対処します。

数分待っても開けない場合は、URLの綴り、JSONの `name`、登録したサブドメイン、デプロイの成功を確認してください。例えばWorker名が `my-learning-store`、アカウントのサブドメインが `haru-learning` の場合は、次のURLになります。

```text
https://my-learning-store.haru-learning.workers.dev/classic/
https://my-learning-store.haru-learning.workers.dev/spa/
https://my-learning-store.haru-learning.workers.dev/lab/
```

`haru-learning` はCloudflare側の設定です。Worker名を変更しても、この部分は変わりません。

## 7. 公開後に確認する

1. MPA・SPAそれぞれで商品が表示されることを確認します。
2. カートに商品を入れ、デモログイン（`demo@example.test` / `demo-password`）して模擬注文を完了します。
3. 注文履歴を確認します。新規会員登録を試す場合は架空の情報と検証専用パスワードを使います。
4. 静的ページ一覧とサンプルHTMLを開きます。
5. アドレス欄が `https://` から始まり、ECサイトを操作できれば公開確認は完了です。計測の検証をする場合は、追加で開発者ツールからCookieのSecure属性も確認します。

公開URLを控えておきます。公開後はPCのターミナルを閉じても、Cloudflare上のサイトは動き続けます。ローカルで作った会員やカートは公開サイトに引き継がれないため、公開先で改めて操作します。

デモユーザーの注文・プロフィール等は、その公開サイトにアクセスする他のデモユーザーと共有されます。この教材は実決済や個人情報の運用を想定していません。

## 導入が完了したら

公開サイトが正常に表示・操作できれば、初回導入は完了です。

商品・色・サイズ・価格、静的ページ、head・bodyタグ、サーバー側Cookieの変更方法は、別の[公開後のカスタマイズ・更新手順](customization.md)にまとめています。自分の変更の再デプロイと、GitHubの配布元から新しい変更を取り込む方法もこちらを参照してください。

## 困ったとき

| 状況 | 確認すること |
| --- | --- |
| `command not found`・「認識されません」が出ます | 手順1で該当ソフトをインストールし、ターミナルを開き直します。 |
| Windowsで `npm.ps1` の実行が禁止されます | `npm ci` は `npm.cmd ci`、`npm run cf:deploy` は `npm.cmd run cf:deploy` のように置き換えます。 |
| `package.json` がないという `ENOENT` が出ます | 実行場所が違います。`pwd` と `ls` を確認し、プロジェクトのフォルダへ `cd` で移動します。 |
| `Missing script: cf:deploy` などが出ます | `git branch --show-current` を実行し、`feat/cloudflare-deployment` か確認します。別フォルダや古いソースを使っていないか、手順2と照合します。 |
| クローン時に `destination path ... already exists` と出ます | 同名フォルダがあります。既存のフォルダを削除せず、別のフォルダ名を指定してクローンします。 |
| クローン時に `Repository not found`・認証エラーが出ます | 下記の「GitHub認証で止まった場合」を確認します。 |
| `npm ci` のダウンロードが失敗します | インターネット接続を確認し、同じフォルダで `npm ci` を再実行します。会社のネットワーク制限の場合は管理者へ確認します。 |
| `wrangler.local.json` が見つかりません | 手順3の `cf:setup` を実行します。 |
| `cf:setup` で `EEXIST` が出ます | 自分用設定が作成済みです。`wrangler.local.json` の `name` を確認し、正しければ手順4へ進みます。 |
| JSONの解析エラーになります | 直前に編集した箇所の半角の引用符・カンマを確認します。全角の引用符や、最後の項目の後ろに余分なカンマを入れないでください。 |
| `cf:dev` のまま次のコマンドを入力できません | 正常な起動中です。そのターミナルでCtrl+Cを押して停止してから次へ進みます。 |
| Cloudflareの認証エラーになります | `npm run cf:login` を再実行し、`npm run cf:whoami` でアカウントを確認します。 |
| ログイン用のブラウザが開きません | ターミナルに認証URLが表示されていれば、自分のブラウザで開きます。失敗した場合はCtrl+Cで終了し、`npm run cf:login` を再実行します。 |
| アカウントの選択を求められます | 自分の公開先を選びます。手順5の例に沿って `account_id` を設定すると固定できます。 |
| サブドメイン登録で `unavailable`・`invalid` が出ます | 手順6の「名前の入力でエラーになった場合」を確認します。 |
| Node.jsのバージョンエラーになります | `node --version` を確認し、Node.js 22以上に更新します。 |
| 公開URLを開けません | 手順6の「公開URLを開く」に戻り、デプロイ成功と、Worker名を含む完全なURLかを確認します。 |
| HTMLやタグの変更が見えません | `npm run cf:deploy` の成功と、表示中の公開URL・Worker名を確認して再読み込みします。 |

### GitHub認証で止まった場合

まずブラウザでGitHubにログインし、[配布元リポジトリ](https://github.com/noda-exture/learning-template)を開きます。404になる場合は、配布元の管理者にアクセス権を依頼します。

ブラウザで開けても、ターミナル側の認証は別に必要な場合があります。HTTPSのクローンで `Username` / `Password` と聞かれた場合、**GitHubの通常のログインパスワードは使えません。** パスワード欄にはアクセストークンを使う方式です。まだ認証を設定していない場合は、[GitHub公式の認証手順](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/about-authentication-to-github)に沿って設定するか、管理者にターミナルのGitHub認証の設定を依頼します。設定後、手順2-2のクローンを再実行します。

### 公開後にサイトがエラーになる場合

プロジェクトのフォルダで、次を実行します。

```sh
npx wrangler tail --config wrangler.local.json
```

Windowsで `npx.ps1` の実行が禁止される場合は、`npx` を `npx.cmd` に置き換えます。接続後にブラウザで公開URLを再読み込みすると、Workerで発生したエラーをターミナルで確認できます。確認後はCtrl+Cで終了します。

解決しない場合は、実行したコマンド、エラーメッセージ、`node --version` の結果、公開URLを配布元の管理者へ伝えてください。ログに入力した個人情報などが含まれる場合は、その部分を伏せます。ログイン用URLやアクセストークンは共有しません。

## 実装と検証範囲

Cloudflare版はWorkerがリクエストを受け、サイトごとに一つのDurable Objectが操作を直列処理してSQLiteへ保存します。保存は応答ごとのトランザクションで確定します。少人数の学習・検証向けで、大量アクセス向けの構成ではありません。

ローカル版の自動テストは `npm test`、公開用ビルドの検証は `npm run cf:check` です。Cloudflareのローカル実行環境を起動した状態で `node tests/cloudflare.integration.mjs` を実行すると、検証用会員を作成して同時注文の重複防止などを確認します。このテストの接続先はlocalhost固定です。

2026年11月10日に、macOSでローカルのCloudflare実行環境・公開用ビルド・結合テストを確認しました。また、利用者が実アカウントに公開したサイトの `/classic/` がHTTP 200でEC画面を返すことを確認しています。公開先での全操作とWindowsでの一連のコマンド実行は未確認です。各自の公開先でも手順7を確認してください。

参考：[Workers CLI](https://developers.cloudflare.com/workers/get-started/guide/)、[workers.dev](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/)、[Durable Objects](https://developers.cloudflare.com/durable-objects/)。
