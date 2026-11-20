# SNS投稿単体へのリンクの対応範囲（2026-11-20）

実装：SNSプロフィール（social_profile）と個別Xポスト（social_post / x_post / platform=x）を別分類にする。リンク収集・埋め込みを自動化せず、審査済みの公開URL・表示名・出所のみ採用する。現時点で実ポストのデータは投入しない。

追加候補（提案段階）：
- Instagramの通常投稿・リール：高優先候補。permalinkが用意されるが、非公開・ログイン・削除時は閲覧できない。
- Threads・Bluesky・Mastodonの公開投稿：中優先候補。各プラットフォームのURL規則と公開範囲を個別に確認。
- TikTok動画：YouTube動画カテゴリとの分類重複や権利関係を先に整理。
- Reddit投稿：コミュニティとしての分類も検討。

個別URLの登録と本文のスクレイピング・画像複製・埋め込みは別の審査事項。SNSプラットフォーム側の認証やAPI権限を勝手に追加しない。

一次資料：
- https://developers.facebook.com/docs/instagram-platform/reference/instagram-media/v21.0/
- https://docs.bsky.app/docs/tutorials/creating-a-post
- https://docs.joinmastodon.org/methods/streaming/
- https://developers.tiktok.com/docs/en/tiktok-api-v2-video-object/
