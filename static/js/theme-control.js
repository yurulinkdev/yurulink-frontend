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
    if (visible) { drawer?.setAttribute('role', 'dialog'); drawer?.setAttribute('aria-modal', 'true'); }
    else { drawer?.removeAttribute('role'); drawer?.removeAttribute('aria-modal'); }
    if (drawer) drawer.inert = !visible && isMobile();
    open?.setAttribute('aria-expanded', String(visible));
    document.body.classList.toggle('overflow-hidden', visible);
    if (visible) close?.focus();
    else if (restoreFocus?.isConnected) restoreFocus.focus();
  };
  if (drawer) drawer.inert = isMobile();
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
    if (drawer) drawer.inert = !event.matches && !drawerOpen;
  });
  const button = document.getElementById('theme-toggle');
  const autoButton = document.getElementById('theme-auto');
  const icon = document.getElementById('theme-icon');
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const read = () => {
    try {
      const value = localStorage.getItem(key);
      return value === 'light' || value === 'dark' ? value : 'auto';
    } catch { return 'auto'; }
  };
  let mode = read();
  const apply = () => {
    const effective = mode === 'auto' ? (mq.matches ? 'dark' : 'light') : mode;
    document.documentElement.dataset.theme = effective;
    if (icon) icon.textContent = effective === 'dark' ? '☾' : '☀';
    if (button) {
      const next = effective === 'dark' ? 'ライト' : 'ダーク';
      button.setAttribute('aria-label', next + 'テーマに切り替え');
      button.title = next + 'テーマに切り替え';
    }
    if (autoButton) {
      autoButton.setAttribute('aria-pressed', String(mode === 'auto'));
      autoButton.title = mode === 'auto' ? 'OS設定に追従中' : 'OS設定に追従';
    }
  };
  const setMode = value => {
    mode = value;
    try {
      if (value === 'auto') localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    } catch { /* storage disabled */ }
    apply();
  };
  button?.addEventListener('click', () => {
    const effective = document.documentElement.dataset.theme;
    setMode(effective === 'dark' ? 'light' : 'dark');
  });
  autoButton?.addEventListener('click', () => setMode('auto'));
  mq.addEventListener?.('change', apply);
  apply();
})();
