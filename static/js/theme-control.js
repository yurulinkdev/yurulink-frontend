(() => {
  const key = 'yurulink-theme';
  const drawer = document.getElementById('category-drawer');
  const backdrop = document.getElementById('drawer-backdrop');
  const open = document.getElementById('open-categories');
  const close = document.getElementById('close-categories');
  const toggle = visible => {
    drawer?.classList.toggle('-translate-x-full', !visible);
    backdrop?.classList.toggle('hidden', !visible);
    open?.setAttribute('aria-expanded', String(visible));
    if (visible) close?.focus();
    else if (document.activeElement === close) open?.focus();
  };
  open?.addEventListener('click', () => toggle(true));
  close?.addEventListener('click', () => toggle(false));
  backdrop?.addEventListener('click', () => toggle(false));
  document.addEventListener('keydown', event => { if (event.key === 'Escape') toggle(false); });
  const button = document.getElementById('theme-toggle');
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const read = () => {
    try {
      const value = localStorage.getItem(key);
      return value === 'light' || value === 'dark' ? value : 'auto';
    } catch { return 'auto'; }
  };
  let mode = read();
  const apply = () => {
    const value = mode;
    document.documentElement.dataset.theme = value === 'auto' ? (mq.matches ? 'dark' : 'light') : value;
    if (button) {
      const next = value === 'auto' ? 'light' : value === 'light' ? 'dark' : 'auto';
      const names = { auto: 'OS設定に追従', light: 'ライト', dark: 'ダーク' };
      button.setAttribute('aria-label', '表示テーマ: ' + names[value] + '。クリックで' + names[next] + 'に変更');
      button.title = '表示テーマ: ' + names[value];
      const icon = value === 'auto' ? '◐' : value === 'light' ? '☀' : '☾';
      button.textContent = icon;
    }
  };
  button?.addEventListener('click', () => {
    mode = mode === 'auto' ? 'light' : mode === 'light' ? 'dark' : 'auto';
    try { localStorage.setItem(key, mode); } catch { /* storage disabled */ }
    apply();
  });
  mq.addEventListener?.('change', apply);
  apply();
})();
