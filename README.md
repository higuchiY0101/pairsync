# PairSync

二人だけの共通の空き時間を表示するアプリです。予定の件名、場所、説明、各人の個別の空き時間は保存・表示しません。

## 使うサービス

- Vercel: アプリの公開
- Supabase: ペアと暗号化済みのGoogle更新トークンだけを保存
- Google Calendar FreeBusy API: 忙しい時間帯だけを取得

## セットアップ

1. `supabase/schema.sql` を Supabase の SQL Editor で実行します。
2. Google Cloud で Calendar API を有効化し、Web application の OAuth client を作ります。
3. Vercel に次の環境変数を設定します（`NEXT_PUBLIC_` の付かない値は秘密です）。

```text
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=https://YOUR-DOMAIN/api/google/callback
APP_URL=https://YOUR-DOMAIN
TOKEN_ENCRYPTION_KEY=32バイトをBase64化した値
SESSION_SIGNING_KEY=32バイト以上のランダムな文字列
```

`TOKEN_ENCRYPTION_KEY` は例として Node.js で `crypto.randomBytes(32).toString('base64')` を一度だけ実行して作ります。値をGitHubへ保存・貼り付けしないでください。

## Google OAuth の設定

- 承認済みの JavaScript origin: `https://YOUR-DOMAIN`
- 承認済みのリダイレクト URI: `https://YOUR-DOMAIN/api/google/callback`
- スコープ: `https://www.googleapis.com/auth/calendar.freebusy` のみ

Google のテスト利用中は、OAuth consent screen の「Test users」に利用者2人のGoogleアカウントを追加してください。外部ユーザーに公開する前には、Googleの検証要件を確認してください。

## セキュリティの設計

- Googleアクセストークンは保存しません。
- 更新トークンは AES-256-GCM で暗号化してからDBに保存します。
- DBのテーブルはRLSを有効化し、ブラウザから直接読み書きできません。
- OAuth の `state` と短期・HttpOnly セッションCookieで、ログイン先とOAuthコールバックを照合します。
- `freeBusy` の結果から共通の空き枠のみを返します。イベント情報や片方だけの結果はAPIレスポンスに含めません。
