# yurulink.com ドメイン導入・Frontend No.3（2026-11-20）

## 目的と変更境界

- 登録：`yurulink.com`は**購入方法・事業者・期間・費用を検討中**。Cloudflare Registrarで1年間取得する案は過去の候補であり、現在の確定指示ではない。ユーザーは2026-11-20時点で空き確認済みと申告、**購入実行は未確認**。
- 公開正規URL：`https://www.yurulink.com/` → Cloudflare Pagesの既存`yurulink-frontend`プロジェクト／`main`。
- 検証URL：`https://staging.yurulink.com/` → 同Pagesプロジェクトの`staging`ブランチ。
- 補助URL：`https://yurulink.com/`およびHTTPアクセスは正規`www`へ**301**恒久リダイレクト。要求パス・クエリも保持する。
- この文書の作成・Frontend stagingコード更新は、**Registrar決済・Cloudflare DNS変更・本番公開・mainマージを行わない**。各操作はユーザーの承認を得る。

## Cloudflare Registrarでの1年購入【比較検討用の旧候補・未確定】

1. Cloudflareダッシュボード → Domain Registration → Register Domains。登録名`yurulink.com`を再検索。
2. 決済直前に空き・初年度価格・更新価格・プレミアム扱いでないことを確認。年数は**1年**を選択。
3. 連絡先・支払方法・規約を確認し決済。必要な登録メール確認を実施。決済情報を公開リポジトリや設計書に記載しない。
4. CloudflareのNSを使うことがCloudflare Registrarの前提。登録後はDNSゾーン・NS・証明書・DNSSECの状態を点検。
5. **自動更新はデフォルト有効**。1年間だけ先払いすることと、1年で失効させることは異なる。ドメイン喪失を避けるため継続利用予定なら自動更新維持を推奨。

## DNS・Pages・分岐の設定（購入完了後、権限と承認を確認）

1. **Stagingから先行**：Pages`yurulink-frontend` → Custom domains → `staging.yurulink.com`を追加・Activate。初期に生成される`staging` CNAMEの宛先を**`staging.yurulink-frontend.pages.dev`**に変更。**Proxied（オレンジ雲）必須**。DNS onlyだとProductionの`main`に流れる可能性がある。
2. Pages側とDNS側でStaging独自ホストのTLS証明書・公開内容・SHA・キャッシュ・`noindex`を検証（独自ホストでも検索エンジンに索引させないように設定）。なお旧`staging.yurulink-frontend.pages.dev`は切替検証中は保持。
3. 本番コンテンツを`main`へ移すことは別途承認のうえ行う。確認した後、Pagesの同じプロジェクトのCustom domainsに`www.yurulink.com`を追加・Activate。DNS`www CNAME yurulink-frontend.pages.dev`（Proxied）を確認。PagesのProduction branchは`main`から変更しない。
4. Apex`@`は「リダイレクト専用」。Cloudflare DNSに`A @ 192.0.2.1`（**Proxied**）を追加。これはCloudflare公式手順の予約済み例示アドレスで、オリジンサーバーではない。不要な重複A/AAAA/CNAMEを作成しない。
5. Cloudflare Rules → Redirect Rules → Single Redirects。フィルタ`(http.host eq "yurulink.com")`、宛先（Dynamic）`concat("https://www.yurulink.com", http.request.uri.path)`、**301**、**Preserve query string有効**。サブドメインには一致しない。HTTP/HTTPS双方の元ホストを一段で正規HTTPSへ転送する。
6. `www`および`staging`はそれぞれ証明書の有効性、HTTPS応答とリンクの絶対パス、OGP/canonicalを確認する。必要なら既存`*.pages.dev`へのアクセスを後日独自ホストへ転送するが、Preview/CIの検証用URLを壊さない。
7. Hugoの`baseURL`を環境別に設定する。**Stagingビルドでは`https://staging.yurulink.com/`、Productionでは`https://www.yurulink.com/`**を使う（`hugo --baseURL`またはCI環境別設定）。現段階は旧Previewが稼働中なので`hugo.toml`の`baseURL`を先行変更しない。
8. Analytics：GA4測定ID`G-8Y659Y3Y8Y`。Frontend `hugo.toml`の`params.analytics.ga4_measurement_id`へ登録。`ga4_hostnames=["www.yurulink.com"]`によりStagingではタグを読み込まない。GA4は訪問者が同意した後にのみ読み込む。GAの計測検証は本番ホストで同意したテスト端末を使い、個人識別情報を送信しない。

## 動作確認チェック

- `https://staging.yurulink.com/about/` → Stagingのコンテンツ、TLS正常、`noindex`適用・GA4通信なし。
- `https://www.yurulink.com/` → Production、本番表示の承認済み内容、Canonical/OGPに`www`ドメイン。
- `http://yurulink.com/about/?q=abc` → 301 `https://www.yurulink.com/about/?q=abc`（パス・クエリ保存）。
- `https://yurulink.com/help/` → 301 `https://www.yurulink.com/help/`。
- `https://staging.yurulink.com/`は**Apexリダイレクトの対象外**。StagingがProductionに誤接続されないことを実際のコミットSHAで確認。
- AnalyticsでStagingが本番のレポートに混入しないことを確認。GDPR等の要否を判断しプライバシー表記を整備。

## No.3 フロントエンド確定仕様

- トップの「お知らせ」ボックスはPC・スマホともに**完全撤去**。本文ページ`/about/`以下で「記事・お知らせ」を扱うことは引き続き可。
- サイドバーの旧「種類から探す」簡略版を廃止し、**すべてのHugoページで同一のナビゲーション部分テンプレート**を用いる。主要グループはYouTubeチャンネル、その他のプレイリスト、動画の位置づけ、サイト・SNS、その他のカテゴリー。
- トップページのみクリックでフィルタ適用し、下層ページの項目は同じカテゴリー値を持つトップへのリンクとする。階層・表示名は同一のHugo部分テンプレートからビルドし、JS生成との二重管理を避ける。
- カテゴリ選択と展開グループは`localStorage`に保持。About・ヘルプ・履歴ページへ移動しても選択状態のハイライトと親グループの展開を維持し、戻ったトップでは最後のカテゴリを再現する。URLクエリ`category`の明示値を優先。
- Google Formsや公開カタログのBackend分類、Book3/Book4、Productionには手を加えない。

## 公式資料

- Registrar：https://developers.cloudflare.com/registrar/get-started/register-domain/
- Pages独自ドメイン：https://developers.cloudflare.com/pages/configuration/custom-domains/
- Staging独自ホスト：https://developers.cloudflare.com/pages/how-to/custom-branch-aliases/
- Apexリダイレクト：https://developers.cloudflare.com/fundamentals/manage-domains/redirect-domain/
- 更新と自動更新：https://developers.cloudflare.com/registrar/account-options/renew-domains/


## 2026-11-21 更新：購入方法・スケジュールは保留

- ユーザーは「ドメイン購入は方法論を含めて検討中、購入したら連絡する」と明言。Cloudflare Registrar／1年購入を**確定事項として扱わない**。ドメイン登録・DNS変更・Pagesカスタムドメイン・301ルールの実操作を先行しない。
- 到達先の設計目標は`www.yurulink.com`のProduction、`staging.yurulink.com`のPreview、Apex→wwwの301。購入先・更新費用・DNS委任・権限委譲の検討結果次第で手順を見直す。
- 既存`pages.dev` Stagingを継続する。環境別Hugo`baseURL`、OGP/Canonical、Cloudflare Web Analytics（候補）、GA4（測定ID取得済・本番ホスト限定）、New Relic（候補）は設定の設計と実運用を分離する。


## 2026-11-21 Cloudflareでドメイン有効化を確認（ユーザー提供画面）

### 確認できた事実と限界

- ユーザー提供のCloudflare Dashboard画像で、`yurulink.com`ゾーンに **Your domain is now protected by Cloudflare** と表示。さらに[GitHub Actionsの読み取り専用DNS監査（Run 44898082254）](https://github.com/yurulinkdev/yurulink-frontend/actions/runs/44898082254)では、Cloudflare 1.1.1.1とGoogle 8.8.8.8が一致して **kim.ns.cloudflare.com / lakas.ns.cloudflare.com** を返し、公開DNS上のCloudflare NS委任が確認できた。ドメインの購入先は、ユーザーが以前に報告したとおり**XServer**。これら2値とCloudflare管理画面で当該ゾーンに割り当てられたNS名との直接照合、登録の契約年数・更新期限、DNSSEC DS、DNSレコード一覧は未確認。
- 画面はCloudflareのゾーンがActiveである根拠であり、`www.yurulink.com`や`staging.yurulink.com`のWeb接続・TLS・公開完了を示すものではない。
- 2026-11-21のFrontend staging SHA `8ce6150f386ff69fe5b598617304d97c88c1c951` でSmoke・Pages Preview SHA・Playwright 38件全成功を確認した。続いてStaging専用の`noindex`をHugoの設定・共通metaテンプレートへ追加し、トップ／記事ページの検証テストを追加（この変更の最新SHA CIは実行結果で別途判定する）。

### Staging独自ドメイン接続の正しい手順（未実施）

1. Cloudflare Dashboardで`yurulink.com`の状態がActive、現在のNS名がXserver設定と一致、既存DNSのMX/TXT/CAA/DS等に意図しない変更がないことを確認。
2. **Workers & Pages → yurulink-frontend → Custom domains → Set up a domain** から `staging.yurulink.com` を追加・Activate。**最初にDNSへ直接CNAMEを追加するのではなくPages側で登録**する。
3. Cloudflare DNS Recordsに自動作成された`staging`のCNAMEを探し、宛先を**`staging.yurulink-frontend.pages.dev`**へ変更。**Proxied（オレンジ雲）必須**。Cloudflare公式ではDNS onlyだとProductionの`main`へ向く可能性がある。
4. HTTPSの証明書発行後に`https://staging.yurulink.com/`および`/about/`へアクセスし、既存`https://staging.yurulink-frontend.pages.dev/`と表示・コンテンツが一致すること、robots metaの`noindex`、GA4本番向け通信なし、HTTP 404、端末別表示を検証。
5. 独自ドメインの受入が通った後に、**Staging専用のHugo baseURLを`https://staging.yurulink.com/`へ変更**し、canonical/OGPの絶対URL、SNSカード、内部リンクを再検証。旧`pages.dev`のCI URLは維持してよいが、canonicalは独自ホストに統一する。
6. `www.yurulink.com` / apex301 / `main`マージ・Production初回有効化は、別途ユーザー承認後に実行する。ドメイン管理画面の有効化だけをもって本番切替を実施しない。

**操作経路の制限**：この会話の連携機能にはCloudflareゾーン／Pages Custom domainsを直接操作する接続がない。したがって上記DNSやPagesの実設定は未実施。GitHub Actionsに保存済みのCloudflare API TokenをDNS管理に流用・追加権限付与して回避することも行わない。

公式：https://developers.cloudflare.com/pages/how-to/custom-branch-aliases/ 、https://developers.cloudflare.com/pages/configuration/custom-domains/。

注：本書の2026-11-20付の「購入方法・事業者検討中」という段落は当時の状態。2026-11-21にユーザーがXServerでの取得とNS設定を報告し、Cloudflare Zone Active画面および公開DNSの両系統のNS照合により状況が更新されている。継続中の未作業はPagesカスタムドメイン接続と実サイトの検証。
