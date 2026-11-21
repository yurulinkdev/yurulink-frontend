/* 全ページ共通のカテゴリー選択・ツリー開閉状態。異なるHugoセクションへ移動しても維持。 */
(() => {
  const nav = document.getElementById('category-buttons');
  if (!nav) return;
  const key = 'yurulink-selected-category-v1';
  const groupsKey = 'yurulink-open-category-groups-v1';
  const read = name => {
    try { return localStorage.getItem(name); } catch { return null; }
  };
  const store = (name, value) => {
    try { localStorage.setItem(name, value); } catch { /* private mode / disabled storage */ }
  };
  const remove = name => {
    try { localStorage.removeItem(name); } catch { /* private mode / disabled storage */ }
  };
  let savedOpen = null;
  try {
    const value = JSON.parse(read(groupsKey) || 'null');
    if (Array.isArray(value)) savedOpen = new Set(value);
  } catch { /* old or corrupt preference: keep HTML defaults */ }

  const groups = [...nav.querySelectorAll('details[data-nav-group]')];
  if (savedOpen !== null) {
    groups.forEach(details => { details.open = savedOpen.has(details.dataset.navGroup); });
  }

  const sync = selected => {
    const value = String(selected || '');
    for (const node of nav.querySelectorAll('[data-category]')) {
      const active = node.dataset.category === value;
      if (active) node.setAttribute('aria-current', 'true');
      else node.removeAttribute('aria-current');
      node.classList.toggle('bg-panel-muted', active);
      if (active) {
        let parent = node.parentElement;
        while (parent && parent !== nav) {
          if (parent.tagName === 'DETAILS') parent.open = true;
          parent = parent.parentElement;
        }
      }
    }
    // 空カテゴリは「すべてのコンテンツ」。保存値も削除して、次の来訪で復元しない。
    if (value) store(key, value);
    else remove(key);
  };
  const get = () => read(key) || '';
  const query = new URL(location.href).searchParams;
  // 明示的なcategory=（空文字を含む）は保存値より優先する。
  const initial = query.has('category') ? (query.get('category') || '') : get();
  sync(initial);

  // ロゴ・サイト名からトップへ戻る操作でも選択中のカテゴリだけ解除する。
  // URL遷移の前に同期的に実行し、他の表示設定・展開状態は保持する。
  document.addEventListener('click', event => {
    const home = event.target.closest('a[data-reset-category]');
    if (home) sync('');
  });
  nav.addEventListener('click', event => {
    const link = event.target.closest('[data-category]');
    if (!link || !nav.contains(link)) return;
    sync(link.dataset.category);
  });
  for (const group of groups) {
    group.addEventListener('toggle', () => {
      // 直前の状態を失わないよう、毎回DOMから開閉集合を再生成。
      store(groupsKey, JSON.stringify(groups.filter(item => item.open).map(item => item.dataset.navGroup)));
    });
  }
  window.YuruLinkCategoryState = { get, sync, reset: () => sync('') };
})();
