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
  // モバイル左端からの右スワイプで開く。touchendだけに依存すると、
  // Safariの戻る操作やtouchcancel時に判定できないことがあるので
  // 水平移動が確定したtouchmoveの時点で開く。縦スクロールは維持する。
  const edgeWidth = 40;
  const swipeDistance = 64;
  const mostlyHorizontal = (dx, dy) => Math.abs(dx) >= swipeDistance && Math.abs(dx) > Math.abs(dy) * 1.5;
  let swipeStart = null;
  document.addEventListener('touchstart', event => {
    if (!isMobile() || drawerOpen || event.touches.length !== 1) { swipeStart = null; return; }
    const touch = event.touches[0];
    swipeStart = touch.clientX <= edgeWidth
      ? { x: touch.clientX, y: touch.clientY } : null;
  }, {passive:true});
  const openOnSwipe = event => {
    if (!swipeStart || !isMobile() || drawerOpen || event.touches?.length > 1) return;
    const touch = event.touches?.[0] || event.changedTouches?.[0];
    if (!touch) return;
    const dx = touch.clientX - swipeStart.x;
    const dy = touch.clientY - swipeStart.y;
    if (dx >= swipeDistance && mostlyHorizontal(dx,dy)) {
      swipeStart = null;
      toggle(true);
    } else if (Math.abs(dy) > Math.max(50, Math.abs(dx))) {
      swipeStart = null;
    }
  };
  document.addEventListener('touchmove', openOnSwipe, {passive:true});
  document.addEventListener('touchend', event => {
    openOnSwipe(event);
    swipeStart = null;
  }, {passive:true});
  document.addEventListener('touchcancel', () => { swipeStart = null; }, {passive:true});
  // ドロワー内の左スワイプは閉じる。こちらもtouchmoveで確定させる。
  let drawerSwipe = null;
  drawer?.addEventListener('touchstart', event => {
    if (!drawerOpen || event.touches.length !== 1) { drawerSwipe = null; return; }
    const touch = event.touches[0];
    drawerSwipe = {x:touch.clientX,y:touch.clientY};
  }, {passive:true});
  const closeOnSwipe = event => {
    if (!drawerSwipe || !drawerOpen) return;
    const touch = event.touches?.[0] || event.changedTouches?.[0];
    if (!touch) return;
    const dx = touch.clientX - drawerSwipe.x;
    const dy = touch.clientY - drawerSwipe.y;
    if (dx <= -swipeDistance && mostlyHorizontal(dx,dy)) {
      drawerSwipe = null;
      toggle(false);
    } else if (Math.abs(dy) > Math.max(50, Math.abs(dx))) {
      drawerSwipe = null;
    }
  };
  drawer?.addEventListener('touchmove',closeOnSwipe,{passive:true});
  drawer?.addEventListener('touchend',event => { closeOnSwipe(event); drawerSwipe = null; },{passive:true});
  drawer?.addEventListener('touchcancel', () => { drawerSwipe = null; }, {passive:true});
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
