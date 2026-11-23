# Cloudflare API Tokenの役割分離・移行計画

更新日: 2026-11-23  
状態: **移行準備（未有効化）**。この文書と対応するWorkflow変更は専用作業ブランチに置き、`main`／Production／DNSを変更しない。

## 目的・認証境界

従来はGitHub Secret `CLOUDFLARE_API_TOKEN`がPages管理権限と`yurulink.com`のDNS管理権限を兼ねていた。Cloudflare Pagesの読み取り処理からDNSを書き換えられないよう、Cloudflareで作成するAPI Tokenを役割別に分離する。

| Cloudflare Tokenの役割 | GitHub Actions Secret | 推奨Cloudflare権限 | Cloudflare対象 | 利用箇所 |
| --- | --- | --- | --- | --- |
| Pages参照 | `CLOUDFLARE_PAGES_API_TOKEN` | **Account → Cloudflare Pages → Read** | YuruLinkの対象Account | Pages一覧・プロジェクト構成・デプロイSHA照合 |
| DNS操作 | `CLOUDFLARE_DNS_API_TOKEN` | **Zone → DNS → Edit（API名: DNS Write）** | **`yurulink.com`のみ** | DNS参照／別途承認済みのDNS変更 |

- いずれもGlobal API Keyは使わず、可能ならCloudflareの**Account-owned API Token**を採用する。両Tokenのアクセス範囲を最小化し、運用上妥当な有効期限を設定する。トークンはユーザーがCloudflare側で作成し、GitHub Secretsに直接登録する。
- Pagesの閲覧用トークンに**Pages Edit/Writeを含めない**。Pagesの作成・削除・設定変更を伴う一回限りの作業には、独立した事前承認と一時権限を設ける。通常の監査CIに管理権限を常設しない。
- DNSの閲覧自体はDNS Write権限で実行可能だが、DNS Writeを持つトークンが漏えいした場合の改ざん影響は残る。**DNSトークンは通常の自動CIから分離し、mainで手動実行する読み取り確認Workflowだけに渡す。** 承認付きWorkflowと実行経路の保護を別途必要とし、今回の移行ではDNS変更用Workflowを追加しない。
- PagesのProduction/Preview配信は既存のGitHub連携による。現行CIの読み取り確認にPagesの書き込み権限は不要。
- GitHub側の`permissions: contents: read`はGitHubの`GITHUB_TOKEN`の権限であり、Cloudflare API Tokenの権限とは別。

## GitHub設定（`yurulinkdev/yurulink-frontend`）

Repository → Settings → Secrets and variables → Actions:

- **Repository Secrets（新規）**: `CLOUDFLARE_PAGES_API_TOKEN`、`CLOUDFLARE_DNS_API_TOKEN`
- **Repository Variables（継続）**: `CLOUDFLARE_ACCOUNT_ID`
- **Repository Variables（新規）**: `CLOUDFLARE_ZONE_ID`（`yurulink.com`の32桁16進数Zone ID）。DNS用トークンに不要なZone Readを付与して`GET /zones`で探索する代わりに、既知のIDを渡す。Zone IDは認証情報そのものではない。
- **旧Secret（暫定維持）**: `CLOUDFLARE_API_TOKEN`。切替後、全参照が消え検証完了してから削除し、Cloudflare側の旧Tokenも失効させる。

GitHub Secretsの値はAPIから読み出せない。登録確認と有効権限確認は、実際の**読み取り専用API呼び出し**により行う。トークン本文をチャット、Issue、ログ、Artifact、文書、コミットに記録しない。

## コード上の対応表

| ファイル | 移行後の認証 |
| --- | --- |
| `.github/workflows/cloudflare-pages-inventory.yml` | Pages Secretのみ。REST APIによる参照 |
| `.github/workflows/cloudflare-inventory-request.yml` | Pages Secretのみ。DNSの認証情報を受け取らない |
| `.github/workflows/cloudflare-dns-token-check.yml` | **手動実行のみ**。DNS SecretとZone IDを使用しDNSレコードGETだけで権限を確認 |
| `.github/workflows/cloudflare-preview-verify.yml` | Pages Secretのみ。SHA一致確認Stepに限定 |
| `.github/workflows/frontend-validation-request.yml` | Pages Secretのみ。Preview照合Stepに限定 |
| `.github/workflows/staging-browser.yml` | Pages Secretのみ。デプロイ待機Stepに限定 |
| `scripts/wait-cloudflare-pages.py` | 環境変数`CLOUDFLARE_PAGES_API_TOKEN`を必須とする。旧名へのfallbackは行わない |

Wranglerは環境変数`CLOUDFLARE_API_TOKEN`を標準的に使用するが、**本件の読み取り棚卸しはREST APIで完結**させ、旧名への環境変数マッピングを不要にする。将来Wranglerを使う場合も、必要Step内だけで`CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_PAGES_API_TOKEN }}`のようにマップする。

## 有効化・検証手順（承認ゲート）

1. 運営者が2種類のCloudflare API Tokenを権限・Resource・有効期限付きで新規作成する。実Token値はチャットに送らずGitHub Repository Secretsへ登録する。
2. `CLOUDFLARE_ZONE_ID`をActions Variablesへ登録する。`CLOUDFLARE_ACCOUNT_ID`は既存値を維持する。
3. 作業ブランチの差分、WorkflowのStep単位のSecretスコープ、YAML構文、Python構文を確認する。**`main`へのマージは運営者の明示承認を要する。**
4. マージ後、`cloudflare-pages-inventory.yml`と`cloudflare-inventory-request.yml`の手動実行でPages一覧・構成を読み、`cloudflare-dns-token-check.yml`を**mainで手動実行**しDNSの読み取りAPIが成功することを確認する。DNS書き込みは実行しない。
5. 次に`staging`のPreview照合とBrowser検証のRunを確認し、対象SHAが一致することを検証する。Productionは公開済み状態を保護し、単にCIが成功したことを本番変更の承認と見なさない。
6. 新規Secretのみを参照することと全ての必要なCIの動作を確認した後、旧`CLOUDFLARE_API_TOKEN`のGitHub Secretを削除し、Cloudflare側の旧広範Tokenも失効させる。

> 注意: Pull RequestのWorkflowからGitHub Secretsを無条件に使う設計は避ける。Fork由来のPRへSecretを渡さない。DNS Writeを使う本番変更は`workflow_dispatch`等の明示的な入力、固定の操作許可リスト、保護されたEnvironmentの承認、記録の監査を要する。

## 非対象

- Cloudflare Pagesのプロジェクト削除／作成やDirect Upload方式への切替
- 本番Custom Domainの追加・DNSレコード変更
- `main`、Production公開、Backend Blue/Green切替
- GitHub Secretsの値をChatGPTが取得・表示すること

## 参考

- [Cloudflare API Tokenの権限一覧](https://developers.cloudflare.com/fundamentals/api/reference/permissions/)
- [Pagesプロジェクトの一覧API](https://developers.cloudflare.com/api/resources/pages/subresources/projects/methods/list/)
- [Pagesデプロイの一覧API](https://developers.cloudflare.com/api/resources/pages/subresources/projects/subresources/deployments/methods/list/)
- [DNSレコード一覧API](https://developers.cloudflare.com/api/resources/dns/subresources/records/methods/list/)
