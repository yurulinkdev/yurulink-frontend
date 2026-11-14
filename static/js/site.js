(() => {
  const catalog = document.getElementById('catalog');
  const viewButtons = [...document.querySelectorAll('[data-catalog-view]')];
  const viewKey = 'yurulink-catalog-view';
  const applyView = (value) => {
    const view = value === 'list' ? 'list' : 'grid';
    catalog?.classList.toggle('catalog-list-view', view === 'list');
    for (const button of viewButtons) {
      button.setAttribute('aria-pressed', String(button.dataset.catalogView === view));
    }
  };
  let initialView = 'grid';
  try { initialView = localStorage.getItem(viewKey) || 'grid'; } catch { /* storage disabled */ }
  applyView(initialView);
  for (const button of viewButtons) button.addEventListener('click', () => {
    const value = button.dataset.catalogView;
    applyView(value);
    try { localStorage.setItem(viewKey, value); } catch { /* storage disabled */ }
  });
  const items = [...document.querySelectorAll('[data-catalog-item]')];
  const search = document.getElementById('query');
  const selected = document.getElementById('selected-category');
  const count = document.getElementById('count');
  const empty = document.getElementById('no-results');
  const initialParams = new URL(location.href).searchParams;
  let category = initialParams.get('category') || '';
  if (search) search.value = initialParams.get('q') || '';
  const categories = [...new Map(items.filter(x => x.dataset.category).map(x => [x.dataset.category, x.dataset.categoryLabel || x.dataset.category])).entries()].sort((a,b)=>a[1].localeCompare(b[1],'ja'));
  const buttons = document.getElementById('category-buttons');
  const makeButton = (label,value) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-panel-muted focus-visible:outline';
    button.textContent = label;
    button.dataset.category = value;
    button.addEventListener('click', () => { category = value; update(); document.getElementById('close-categories')?.click(); });
    return button;
  };
  buttons?.append(makeButton('すべてのコンテンツ',''));
  for (const [id, label] of categories) buttons?.append(makeButton(label,id));
  const update = () => {
    const q = (search?.value || '').trim().toLocaleLowerCase('ja');
    let visible = 0;
    for (const item of items) {
      const match = (!category || item.dataset.category === category) &&
        (item.dataset.search || '').toLocaleLowerCase('ja').includes(q);
      item.hidden = !match;
      if (match) visible++;
    }
    if (selected) selected.textContent = (categories.find(([id]) => id === category)?.[1]) || 'すべてのコンテンツ';
    if (count) count.textContent = visible + ' 件 / 全 ' + items.length + ' 件';
    if (empty) empty.hidden = visible > 0 || items.length === 0;
    for (const button of buttons?.querySelectorAll('button') || []) {
      button.setAttribute('aria-current', String(button.dataset.category === category));
      button.classList.toggle('bg-panel-muted',button.dataset.category === category);
    }
    const url = new URL(location.href);
    if (category) url.searchParams.set('category',category);
    else url.searchParams.delete('category');
    if (q) url.searchParams.set('q', q);
    else url.searchParams.delete('q');
    history.replaceState(null,'',url);
  };
  search?.addEventListener('input',update);
  window.addEventListener('popstate', () => {
    const params = new URL(location.href).searchParams;
    category = params.get('category') || '';
    if (search) search.value = params.get('q') || '';
    update();
  });
  update();
})();
