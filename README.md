# 店ボット・デモ

小規模店のホームページに置く、ボタン案内とFAQ検索のチャットです。AIは使いません。飲食・美容室・整体の架空店舗で、ライト・標準・充実の3プランを切り替えます。

ブラウザは Supabase の公開URLと anon キーだけで話します。秘密鍵や service_role は置きません。

## 画面

- `/` ランディング。3つのデモと埋め込み方
- `/demo/light` `/demo/standard` `/demo/full` 業種を選んで試す
- `/widget/light` など。iframe 用のチャットだけ
- `/embed.js` 右下に iframe を出すスクリプト
- `/admin` ログインしたお店のFAQ編集。充実プランの引き継ぎ一覧

埋め込み例:

```html
<iframe src="https://YOUR_HOST/widget/standard" title="お店のチャット" width="380" height="640" style="border:0"></iframe>
<script src="https://YOUR_HOST/embed.js" data-plan="standard" defer></script>
```

`data-plan` は `light` / `standard` / `full` です。

## プランの違い

どのデモも最初に業種（飲食店・カフェ／美容室・サロン／整体院・治療院）を選びます。

- ライト: FAQボタンと自由入力。自由入力は正規化・同義語・表記ゆれでFAQを探します。無ければ「お店に直接お問い合わせください」と連絡先
- 標準: ライトに加えて、メニュー・予約・営業時間・アクセスのボタン。予約はボットでは確定せず、お店の予約ページ（デモでは example.com）へ誘導。管理画面で自店のFAQだけ追加・編集・削除
- 充実: 標準に加えて、答えられないときは「スタッフにおつなぎしますか？」。名前・連絡先・質問を保存し、その店の管理画面に出します。お客様には「スタッフからN営業日以内にご連絡します」と伝えます。リアルタイムチャットもメール送信もありません

整体の案内文は、治る・改善・効くなどの断定を避けます。医療っぽい質問には、見込みを言わず来院・相談へ案内します。

## 先に実行するSQL

Supabase の SQL Editor で、次の順にファイル全体を実行します。

1. `supabase/migrations/20261110120000_init.sql`
2. `supabase/seed.sql`
3. `supabase/migrations/20261110143000_handoff_guard.sql`
4. Authentication でデモユーザーを3人作り、メール確認を完了する（`email_confirmed_at` が必要）
5. `supabase/seed_members.sql`
6. `supabase/tests/rls_isolation.sql`（成功してもロールバックされます）
7. Edge Function `supabase/functions/handoff` をデプロイする。追加の secret は不要です。`HANDOFF_IP_SALT` が無いときは、注入済みの `SUPABASE_SERVICE_ROLE_KEY` を鍵にした HMAC-SHA256（メッセージ `handoff-ip-salt-v1`）をソルトにします。この値はログにもレスポンスにも出しません。`HANDOFF_ALLOWED_ORIGINS` が無いときは `https://shop-chatbot-demo-0lf2.onrender.com,http://localhost:5173,http://127.0.0.1:5173` を使います。どちらも環境変数があればそちらが優先されます。

`pg_cron` は Supabase の無料枠に含まれます。マイグレーションが「pg_cron を作成できませんでした」と出たら、Dashboard の Database → Extensions で pg_cron を有効にしてから、同じファイル末尾の `cron.schedule` を再実行してください。有効なら、7日より古い `handoff_requests` を毎日 03:15 UTC に削除します。

`seed.sql` をやり直すと3店舗が消えて作り直され、FAQ・メニュー・引き継ぎ・紐づけも消えます。そのあとは `seed_members.sql` をもう一度実行します。

## 認証ユーザーと店舗の紐づけ

Dashboard → Authentication → Users → Add user でユーザーを作ります。Auto Confirm をオンにすると `email_confirmed_at` が入り、`seed_members.sql` が紐づけます。未確認のユーザーは紐づけません。公開サインアップを止める設定は、このリポジトリの外で行います。

Users → Add user で次の3人を作ります。パスワードは各自で決め、リポジトリに書かないでください。

| メール | 店舗 |
| --- | --- |
| komorebi.demo@example.com | カフェ・こもれび |
| lumiere.demo@example.com | ヘアサロン・ルミエール |
| yasuragi.demo@example.com | やすらぎ整体院 |

その後 `supabase/seed_members.sql` を実行します。メールアドレスで `auth.users` を引き、`shop_members` に1ユーザー1店舗で入れます。

UUID を自分で決める場合のプレースホルダは次です。Dashboard の自動採番とは別なので、メール照合を使うときはこのUUIDは使いません。

| 認証ユーザー | 店舗 id |
| --- | --- |
| `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1` | `11111111-1111-4111-8111-111111111111`（komorebi） |
| `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2` | `22222222-2222-4222-8222-222222222222`（lumiere） |
| `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3` | `33333333-3333-4333-8333-333333333333`（yasuragi） |

対応する insert 例は `seed_members.sql` のコメントにあります。

ログイン後、管理画面はそのユーザーの店だけを読み書きします。他店のFAQや引き継ぎはポリシーで見えません。チャット画面はログインを持たない anon クライアントなので、管理画面にログインしていても公開データだけを読みます。

## 環境変数

`.env.example` を `.env` にコピーします。

```bash
cp .env.example .env
```

| 名前 | 役割 |
| --- | --- |
| `VITE_SUPABASE_URL` | `https://ofpaiegiilfxloprmcwi.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Dashboard → Project Settings → API の anon（公開）キー |

足りないとき、画面に不足している変数名を出して止まります。JWT の role が `service_role` のキーは拒否します。`.env` はコミットしません。

ビルド時に Vite がこの2つをブラウザ用JSへ埋め込みます。anon キーは公開前提で、保護はRLSが行います。

## ローカル実行

```bash
npm ci
npm run dev
```

開発サーバは `http://localhost:5173` です。SQLを入れる前でも、環境変数が空ならその案内が出ます。キーを入れたあとはサーバを起動し直してください。

```bash
npm test
npm run build
npm run preview
```

`npm test` はキーワード検索・導線の単体テストと、埋め込みPostgresでのRLSスクリプトです。`npm run seed:sql` は `src/data/demo-seed.ts` から `supabase/seed.sql` を再生成します。

## Render

`render.yaml` は無料の静的サイトだけです。Postgres、Key Value、ディスク、有料プランはありません。

1. Render でこのリポジトリの Blueprint を作ります
2. 作成時に `VITE_SUPABASE_ANON_KEY` を聞かれます。anon キーを入れます
3. ビルドは `npm ci && npm run build`、公開ディレクトリは `dist` です
4. `/*` は `index.html` に書き戻すので、`/demo/standard` などを直接開けます

静的サイトはリクエストのたびにスリープしません。帯域とビルド時間だけ、ワークスペースの無料枠を使います。

## データの守られ方

- `anon` は公開中の店舗・メニュー・公開FAQを読むだけです
- `anon` は引き継ぎを insert できません。送信は Edge Function `handoff` だけが行い、サービスロールで `public.accept_handoff` を呼びます。IP はソルト付きハッシュで、1時間に5件までです。ソルト用の secret は無くてもデプロイできます。店舗ごとには1時間30件の上限もあります。プランが `full` の店だけ受け付けます
- ログインユーザーは `shop_members` で紐づいた店の行だけです。参照は `private.current_shop_ids()`（security definer、`search_path` 空）です
- ヘルパー関数は `private` にあります。Data API の Exposed schemas に `private` を追加しないでください
- 認可に `user_metadata` は使っていません
- プロジェクト全体の `pgrst.db_pre_request` は変えていません。IP単位の制限を足すと、同じプロジェクトの他APIまで巻き込むためです
- 整体の答え・メニュー・店舗案内に効能の断定があると保存時に拒否します。質問文そのもの（「治りますか？」）は拒否しません

RLSの確認は `supabase/tests/rls_isolation.sql` です。`set local role` と `request.jwt.claims` / `request.jwt.claim.sub` で anon と3店舗のユーザーを切り替え、他店のFAQ・メニュー・引き継ぎが見えないこと、anon が引き継ぎを読めないこと、長すぎる本文やレート超過が落ちることを見ます。SQL Editor は postgres なので、この切り替えをしない select では全行が見えます。それはRLSの穴ではありません。

## 架空の店

カフェ・こもれび、ヘアサロン・ルミエール、やすらぎ整体院。住所も料金も予約URL（`https://example.com/reserve/...`）もデモ用です。
