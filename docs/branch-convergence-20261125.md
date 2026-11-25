# 2026-11-25 ブランチ統合・環境設定監査

比較対象: main e7b1193009354ed80bafdd1db5e837fc215df63c / staging 1b95b1fd6bb40e029e1cac7166569564e637184f。三点比較のコミット数ではなくrecursive treeのblob SHAを照合。main 137ファイル、staging 149ファイル。公開catalog.jsonと月別履歴は同一。更新履歴v3のテンプレート・テストおよびB案ブランド素材はstaging側を採用する。

| 分類 | 方針 |
| --- | --- |
| 共通 | layouts/assets/static/content（自動履歴除く）/i18n/tests/Workflow/運用手順。B案の現行素材とv3表示を保持 |
| staging適用 | Preview URL/noindex/OGP/検証フォーム。環境定義ファイル自体は両方で保持 |
| main適用 | Production URL/GA4/受付無効/本番Workflowの実行条件。コードの片側専有を避ける |
| 生成物 | public、resources、config/production/hugo.toml。追跡しない |
| データ | catalog.json、月別履歴は別配信。今回変更しない |
| 運用要求 | main限定Workflowの固定要求や一回限りのDNSスクリプトは今回保全、後続で参照調査・削除判断 |

mainに存在する強化済みCloudflare read-only棚卸しWorkflowと運用資料を開発側へ還元。旧プロジェクトの廃止検証を残す。旧ブランド画像6件は既存stagingで除外済み、過去mainコミットとDriveに保全記録がある。Productionからの除外は昇格承認に含めて判断する。旧root hugo.tomlと旧production overlayは構成変更で置換する。Cloudflareの実設定・DNS・Secrets・公開JSONは変更しない。

現段階は統合PRの準備。CI/Preview/Production反映は実行結果を確認して別途記録する。
