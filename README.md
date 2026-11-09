# YuruLink Frontend

バックエンドが生成した公開用JSONからHugoで静的サイトを構築し、Cloudflare Pagesにデプロイするフロントエンドです。

旧Tohaサンプルサイトは移行せず、クリーンな構成から開始します。現時点では公開JSONの仕様、サイトテンプレート、デプロイ設定は未実装です。

公開リポジトリにはGoogle Cloudの認証情報、非公開のGoogle Sheetsデータ、APIキーを含めないでください。

## UI prototype (PR #3)

Mobile-first catalog: desktop left navigation, mobile slide-out category drawer, responsive cards, and a light/dark/automatic theme selector. The current categories are a **flat list of program names**; nested playlists and Pagefind integration are planned after the public JSON schema is finalized.

### Build

Requires Hugo (extended recommended) and Node.js 20+.

```sh
npm install
npm run build
```

For local development, run `npm run css:watch` in one terminal and `hugo server` in another. The CSS is compiled by Tailwind CSS v4 with daisyUI v5; no runtime CSS CDN is required. `static/css/site.css` is a generated build artifact, not a source file.

### Important limitations

- No real data is committed or deployed; `data/public/videos.json` is supplied by the future backend publishing job.
- The existing client-side filter is a small-data prototype. Do **not** ship thousands of rendered records to mobile clients; integrate Pagefind and paginated/virtualized results before production.
- No Cloudflare Pages configuration or production domain switch is included.
- The selected theme is stored locally, and automatic mode follows the operating-system setting.
