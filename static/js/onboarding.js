/* 初回訪問のナビゲーション案内。通信なし、同一ブラウザで一度だけ表示。
 * 固定画面座標ではなく対象のUIコンテナへ配置し、iOSの可視Viewport
 * の伸縮・スクロールでガイドが画面下端に飛ぶ問題を避ける。
 */
(() => {
  const key = 'yurulink-first-visit-hint-v1';
  const ui = (() => { try { return JSON.parse(document.getElementById('yl-ui-messages')?.textContent || '{}'); } catch { return {}; } })();
  const tr = (name, fallback) => ui[name] || fallback;
  try { if (localStorage.getItem(key)) return; } catch { /* ブラウザ設定により保存不可 */ }
  const mobile = matchMedia('(max-width: 1023px)').matches;
  const target = document.getElementById(mobile ? 'open-categories' : 'categories-intro-anchor');
  if (!target) return;

  const hint = document.createElement('div');
  hint.id = 'onboarding-hint';
  hint.className = 'onboarding-hint ' + (mobile ? 'onboarding-hint--mobile' : 'onboarding-hint--desktop');
  hint.setAttribute('role', 'status');
  hint.innerHTML = '<p></p><button type="button" aria-label="PLACEHOLDER">×</button>';
  hint.querySelector('button').setAttribute('aria-label', tr('onboardingClose','案内を閉じる'));
  hint.querySelector('p').textContent = mobile
    ? tr('onboardingMobile','左上のメニューボタンから、番組やカテゴリーを選べます。')
    : tr('onboardingDesktop','左側のカテゴリーから、見たい番組や種類を選べます。');

  // Mobile: position relative to the header, immediately below its menu button.
  // Desktop: render in the sidebar flow below the category label.
  // Do not use window.innerHeight or viewport-relative fixed positioning here.
  const header = mobile ? target.closest('header') : null;
  if (mobile && header) {
    header.append(hint);
  } else {
    target.after(hint);
  }

  const clear = () => {
    hint.remove();
    target.classList.remove('onboarding-highlight');
    target.removeAttribute('aria-describedby');
    document.removeEventListener('keydown', onKey);
    document.removeEventListener('yurulink:drawer-swipe-opened', clear);
  };
  const onKey = e => { if (e.key === 'Escape') clear(); };

  target.classList.add('onboarding-highlight');
  target.setAttribute('aria-describedby', hint.id);
  hint.querySelector('button').addEventListener('click', clear);
  target.addEventListener('click', clear, { once: true });
  // 案内の下にあるリンクも通常どおり押せるようにし、操作開始時に案内を閉じる。
  document.getElementById('category-buttons')?.addEventListener('click', clear, { once: true });
  document.addEventListener('keydown', onKey);
  if (mobile) document.addEventListener('yurulink:drawer-swipe-opened', clear, { once: true });

  try { localStorage.setItem(key, '1'); } catch { /* 次回も案内表示の可能性あり */ }
})();
