# staging → main 昇格運用
2026-11-25の方針。以前の選択移植中心の案は[旧版](https://github.com/yurulinkdev/yurulink-frontend/blob/e7b1193009354ed80bafdd1db5e837fc215df63c/docs/staging-main-promotion-runbook.md)に保存。

1. 開発・修正はstagingへ統合する。mainで緊急修正が必要な場合は開発側へ還元する。
2. main/stagingの両先端のtreeを比較する。データ配信・操作要求・環境変数とコード差を区別し、共通定義は同じファイルを保持する。
3. 共通コード、素材、CI、両環境設定を含めてstagingでSmoke、両環境ビルド、対象SHAのPreview、Chromiumを確認する。
4. 運営者承認後、stagingからmainへの通常PRをマージする。履歴の収束にはmerge commitを利用し、強制pushやsquashによる祖先の喪失を避ける。mainの新しいデータ更新は上書きしない。PR作成だけでは公開承認にならない。
5. ProductionのSHA・canonical・OGP・noindex・投稿受付・計測・主要機能を確認。不合格ならRevert PRまたは前回正常版に復旧する。
6. 通常の検証済みデータ配信は独立経路。main保護と両立するPR自動配信を別途設計・検証し、運用を開始するまでは既存経路を変更しない。

環境値は[環境仕様](environments.md)、差分の分類は[2026-11-25監査](branch-convergence-20261125.md)を参照。