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
  const select = document.getElementById('theme-select');
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
    if (select) select.value = value;
  };
  select?.addEventListener('change', () => {
    const value = select.value;
    if (!['auto', 'light', 'dark'].includes(value)) return;
    mode = value;
    try { localStorage.setItem(key, value); } catch { /* storage disabled */ }
    apply();
  });
  mq.addEventListener?.('change', apply);
  apply();
})();
