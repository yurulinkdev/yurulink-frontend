/* 旧 /?category=... ブックマーク・共有URLを検索ページへ互換転送。通常の / はようこそページ。 */
(() => {
  const params = new URLSearchParams(location.search);
  const catalogKeys = ['category','q','sort','page','size','types','date_field','from','to','people'];
  if (!catalogKeys.some(key => params.has(key))) return;
  location.replace('/catalog/' + location.search + location.hash);
})();
