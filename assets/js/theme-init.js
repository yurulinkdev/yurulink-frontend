(() => {
  let mode = 'auto';
  try { mode = localStorage.getItem('yurulink-theme') || 'auto'; } catch {}
  if (mode !== 'light' && mode !== 'dark') mode = 'auto';
  const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.dataset.theme = mode === 'auto' ? (dark ? 'dark' : 'light') : mode;
})();
