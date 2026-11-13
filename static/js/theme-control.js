(() => {
  const key = 'yurulink-theme';
  const select = document.getElementById('theme-select');
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const read = () => {
    try {
      const value = localStorage.getItem(key);
      return value === 'light' || value === 'dark' ? value : 'auto';
    } catch { return 'auto'; }
  };
  const apply = () => {
    const value = read();
    document.documentElement.dataset.theme = value === 'auto' ? (mq.matches ? 'dark' : 'light') : value;
    if (select) select.value = value;
  };
  select?.addEventListener('change', () => {
    const value = select.value;
    if (!['auto', 'light', 'dark'].includes(value)) return;
    try { localStorage.setItem(key, value); } catch { /* storage disabled */ }
    apply();
  });
  mq.addEventListener?.('change', apply);
  apply();
})();
