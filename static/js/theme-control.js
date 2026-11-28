(() => {
  const key = 'yurulink-theme';
  const drawer = document.getElementById('category-drawer');
  const backdrop = document.getElementById('drawer-backdrop');
  const open = document.getElementById('open-categories');
  const close = document.getElementById('close-categories');
  const guide = document.getElementById('swipe-guide');
  const mobileQuery = window.matchMedia('(max-width: 1023px)');
  const touchQuery = window.matchMedia('(any-pointer: coarse)');
  const isMobile = () => mobileQuery.matches;
  const browserEdge = 24;
  const swipeGuideKey = 'yurulink-swipe-guide-completed-v1';
  const swipeGuideAnimationKey = 'yurulink-swipe-guide-animated-v1';
  let drawerOpen = false;
  let restoreFocus = null;
  let guideCompleted = false;
  let guideAnimated = false;
  try { guideCompleted = localStorage.getItem(swipeGuideKey) === '1'; } catch { /* 保存不可 */ }
  try { guideAnimated = sessionStorage.getItem(swipeGuideAnimationKey) === '1'; } catch { /* 保存不可 */ }
  guide?.style.setProperty('--swipe-guide-start', `${browserEdge}px`);
  const updateSwipeGuide = () => {
    if (!guide) return;
    const visible = isMobile() && touchQuery.matches && !drawerOpen && !guideCompleted && (window.visualViewport?.scale || 1) <= 1.01;
    if (guide.hidden === !visible) return;
    guide.hidden = !visible;
    if (!visible) { guide.classList.remove('swipe-guide--animate'); return; }
    // スワイプを覚えるまでは静止ガイドを残す。アニメーションはタブ内の初回のみ。
    if (!guideAnimated) {
      guideAnimated = true;
      guide.classList.add('swipe-guide--animate');
      try { sessionStorage.setItem(swipeGuideAnimationKey, '1'); } catch { /* 保存不可 */ }
    }
  };
  const completeSwipeGuide = () => {
    guideCompleted = true;
    try { localStorage.setItem(swipeGuideKey, '1'); } catch { /* このページ内では非表示 */ }
    updateSwipeGuide();
  };
  guide?.addEventListener('animationend', () => guide.classList.remove('swipe-guide--animate'));
  touchQuery.addEventListener?.('change', updateSwipeGuide);
  window.visualViewport?.addEventListener('resize', updateSwipeGuide);
  window.addEventListener('storage', event => {
    if (event.key === swipeGuideKey && event.newValue === '1') { guideCompleted = true; updateSwipeGuide(); }
  });
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
    updateSwipeGuide();
    if (visible) close?.focus();
    else if (restoreFocus?.isConnected) restoreFocus.focus();
  };
  if (drawer) drawer.inert = isMobile();
  updateSwipeGuide();
  // 画面の物理端はOS・ブラウザの戻る操作に譲る。内側だけを補助ジェスチャーにする。
  // 開く操作は移動中に閾値を満たした時点で確定する。閉じる操作は指を離した時点で確定する。
  // touchイベントの既定動作は止めず、画面端のブラウザ操作を優先する。
  const menuEdge = 96;
  const swipeDistance = 64;
  const directionSlop = 12;
  const mostlyHorizontal = (dx, dy) => Math.abs(dx) >= swipeDistance && Math.abs(dx) > Math.abs(dy) * 1.5;
  const ignoreSwipeTarget = target => {
    if (!(target instanceof Element)) return true;
    if (target.closest('input, textarea, select, button, label, summary, [contenteditable], [role="slider"], [draggable="true"], video, audio, iframe, canvas')) return true;
    // 横スクロール可能なコードブロック・表等は元の操作を優先する。
    for (let node = target; node && node !== document.body; node = node.parentElement) {
      if (node.scrollWidth > node.clientWidth + 2 && /auto|scroll/.test(getComputedStyle(node).overflowX)) return true;
    }
    return false;
  };
  let swipe = null;
  const resetSwipe = () => { swipe = null; };
  const moveSwipe = event => {
    if (!swipe || event.touches.length !== 1 || !isMobile()) { resetSwipe(); return; }
    const touch = event.touches[0];
    const dx = (touch.clientX - swipe.x) * swipe.direction;
    const dy = Math.abs(touch.clientY - swipe.y);
    // 先に縦方向へ動いた操作や、反対方向へ動いた操作は途中から開閉へ変えない。
    if (dx < -directionSlop || (dy > directionSlop && dy >= Math.abs(dx))) { resetSwipe(); return; }
    if (swipe.direction === 1 && !drawerOpen && dx >= swipeDistance && mostlyHorizontal(dx, dy)) {
      // 一度開いた操作は消費済みとし、同じ指の後続イベントで再度開閉しない。
      resetSwipe();
      toggle(true);
      completeSwipeGuide();
      document.dispatchEvent(new Event('yurulink:drawer-swipe-opened'));
    }
  };
  document.addEventListener('touchstart', event => {
    resetSwipe();
    if (!isMobile() || event.touches.length !== 1 || ignoreSwipeTarget(event.target)) return;
    if (window.getSelection()?.type === 'Range' || (window.visualViewport?.scale || 1) > 1.01) return;
    const touch = event.touches[0];
    if (drawerOpen) {
      if (!drawer?.contains(event.target) || touch.clientX < browserEdge) return;
      swipe = {x:touch.clientX, y:touch.clientY, direction:-1};
    } else if (touch.clientX >= browserEdge && touch.clientX <= menuEdge) {
      swipe = {x:touch.clientX, y:touch.clientY, direction:1};
    }
  }, {passive:true});
  document.addEventListener('touchmove', moveSwipe, {passive:true});
  document.addEventListener('touchend', event => {
    const start = swipe;
    resetSwipe();
    if (!start || start.direction !== -1 || !drawerOpen || !isMobile() || event.touches.length !== 0 || event.changedTouches.length !== 1) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (mostlyHorizontal(dx, dy) && dx <= -swipeDistance) toggle(false);
  }, {passive:true});
  document.addEventListener('touchcancel', resetSwipe, {passive:true});
  window.addEventListener('pagehide', resetSwipe);
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
  mobileQuery.addEventListener?.('change', event => {
    if (!event.matches && drawerOpen) toggle(false);
    if (drawer) drawer.inert = event.matches && !drawerOpen;
    updateSwipeGuide();
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
