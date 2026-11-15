(() => {
  const key = 'yurulink-theme';
  const drawer = document.getElementById('category-drawer');
  const backdrop = document.getElementById('drawer-backdrop');
  const open = document.getElementById('open-categories');
  const close = document.getElementById('close-categories');
  let drawerOpen = false;
  let restoreFocus = null;
  const isMobile = () => window.matchMedia('(max-width: 1023px)').matches;
  const focusables = () => [...(drawer?.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])') || [])].filter(element => element.getClientRects().length > 0);
  const toggle = visible => {
    if (!isMobile() && visible) return;
    if (drawerOpen === visible) return;
    drawerOpen = visible;
    if (visible) restoreFocus = document.activeElement;
    drawer?.classList.toggle('-translate-x-full', !visible);
    backdrop?.classList.toggle('hidden', !visible);
    if (visible) drawer?.setAttribute('aria-modal', 'true');
    else drawer?.removeAttribute('aria-modal');
    open?.setAttribute('aria-expanded', String(visible));
    document.body.classList.toggle('overflow-hidden', visible);
    if (visible) close?.focus();
    else if (restoreFocus?.isConnected) restoreFocus.focus();
  };
  open?.addEventListener('click', () => toggle(true));
  close?.addEventListener('click', () => toggle(false));
  backdrop?.addEventListener('click', () => toggle(false));
  document.addEventListener('keydown', event => {
    if (!drawerOpen) return;
    if (event.key === 'Escape') { event.preventDefault(); toggle(false); return; }
    if (event.key !== 'Tab') return;
    const elements = focusables();
    if (!elements.length) { event.preventDefault(); return; }
    const first = elements[0], last = elements[elements.length - 1];
    if (event.shiftKey && (document.activeElement === first || !drawer.contains(document.activeElement))) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !drawer.contains(document.activeElement))) {
      event.preventDefault(); first.focus();
    }
  });
  window.matchMedia('(min-width: 1024px)').addEventListener?.('change', event => {
    if (event.matches && drawerOpen) toggle(false);
  });
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
