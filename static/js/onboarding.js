/* 初回訪問のナビゲーション案内。通信なし、同一ブラウザで一度だけ表示。 */
(() => {
  const key = 'yurulink-first-visit-hint-v1';
  try { if (localStorage.getItem(key)) return; } catch { /* ブラウザ設定により保存不可 */ }
  const mobile = matchMedia('(max-width: 1023px)').matches;
  const target = document.getElementById(mobile ? 'open-categories' : 'categories-intro-anchor');
  if (!target) return;
  const hint = document.createElement('div');
  hint.id = 'onboarding-hint';
  hint.className = 'onboarding-hint';
  hint.setAttribute('role', 'status');
  hint.innerHTML = '<p></p><button type="button" aria-label="案内を閉じる">×</button>';
  hint.querySelector('p').textContent = mobile
    ? '左上のメニューボタンから、番組やカテゴリーを選べます。'
    : '左側のカテゴリーから、見たい番組や種類を選べます。';
  const clear = () => {
    hint.remove();
    target.classList.remove('onboarding-highlight');
    target.removeAttribute('aria-describedby');
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('resize', relocate);
  };
  const onKey = e => { if (e.key === 'Escape') clear(); };
  const relocate = () => {
    const r = target.getBoundingClientRect();
    if (mobile) {
      hint.style.top = Math.min(innerHeight - hint.offsetHeight - 12, r.bottom + 9) + 'px';
      hint.style.left = '12px';
      hint.style.right = '12px';
    } else {
      hint.style.top = Math.min(innerHeight - hint.offsetHeight - 12, Math.max(12, r.bottom + 8)) + 'px';
      hint.style.left = Math.max(12, r.left) + 'px';
      hint.style.right = 'auto';
    }
  };
  target.classList.add('onboarding-highlight');
  target.setAttribute('aria-describedby', hint.id);
  document.body.append(hint);
  hint.querySelector('button').addEventListener('click', clear);
  target.addEventListener('click', clear, { once: true });
  // 案内の下にあるリンクも通常どおり押せるようにし、操作開始時に案内を閉じる。
  document.getElementById('category-buttons')?.addEventListener('click', clear, { once: true });
  document.addEventListener('keydown', onKey);
  window.addEventListener('resize', relocate);
  relocate();
  try { localStorage.setItem(key, '1'); } catch { /* 次回も案内表示の可能性あり */ }
})();