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
  // モバイルの画面左端から右への水平スワイプで開く。縦スクロールとは干渉させない。
  // iOSのブラウザ戻るジェスチャーと競合するため、右方向70px以上の明確な操作だけ判定する。
  let swipeStart = null;
  document.addEventListener('touchstart', event => {
    if (!isMobile() || drawerOpen || event.touches.length !== 1) return;
    const touch = event.touches[0];
    if (touch.clientX > 28) return;
    swipeStart = {x:touch.clientX, y:touch.clientY};
  }, {passive:true});
  document.addEventListener('touchend', event => {
    if (!swipeStart) return;
    const start = swipeStart;
    swipeStart = null;
    if (!isMobile() || drawerOpen || !event.changedTouches.length) return;
    const touch = event.changedTouches[0];
    if (touch.clientX - start.x >= 70 && Math.abs(touch.clientY - start.y) <= 50) toggle(true);
  }, {passive:true});
  document.addEventListener('touchcancel', () => { swipeStart = null; }, {passive:true});
  // ドロワー表示中に左へスワイプした場合は閉じる。
  let drawerSwipe = null;
  drawer?.addEventListener('touchstart', event => {
    if (!drawerOpen || event.touches.length !== 1) return;
    const touch = event.touches[0];
    drawerSwipe = {x:touch.clientX, y:touch.clientY};
  }, {passive:true});
  drawer?.addEventListener('touchend', event => {
    if (!drawerSwipe || !event.changedTouches.length) return;
    const start = drawerSwipe; drawerSwipe = null;
    const touch = event.changedTouches[0];
    if (touch.clientX - start.x <= -70 && Math.abs(touch.clientY - start.y) <= 50) toggle(false);
  }, {passive:true});
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
