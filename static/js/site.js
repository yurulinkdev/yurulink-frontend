(() => {
  const root = document.documentElement;
  const key = 'yurulink-theme';
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const select = document.getElementById('theme-select');
  const getPreference = () => {
    try { return localStorage.getItem(key) || 'auto'; } catch { return 'auto'; }
  };
  const apply = () => {
    const pref = getPreference();
    root.dataset.theme = pref === 'auto' ? (mq.matches ? 'dark' : 'light') : pref;
    if (select) select.value = pref;
  };
  select?.addEventListener('change', () => {
    try { localStorage.setItem(key, select.value); } catch { /* storage disabled */ }
    apply();
  });
  mq.addEventListener?.('change', apply);
  apply();

  const items = [...document.querySelectorAll('[data-catalog-item]')];
  const search = document.getElementById('query');
  const selected = document.getElementById('selected-category');
  const count = document.getElementById('count');
  const empty = document.getElementById('no-results');
  const drawer = document.getElementById('category-drawer');
  const backdrop = document.getElementById('drawer-backdrop');
  const open = document.getElementById('open-categories');
  const close = document.getElementById('close-categories');
  let category = new URL(location.href).searchParams.get('category') || '';
  const categories = [...new Set(items.map(x => x.dataset.source).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ja'));
  const buttons = document.getElementById('category-buttons');
  const makeButton = (label,value) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-panel-muted focus-visible:outline';
    button.textContent = label;
    button.dataset.category = value;
    button.addEventListener('click', () => { category = value; update(); toggle(false); });
    return button;
  };
  buttons?.append(makeButton('すべてのコンテンツ',''));
  for (const source of categories) buttons?.append(makeButton(source,source));
  const toggle = visible => {
    drawer?.classList.toggle('-translate-x-full',!visible);
    backdrop?.classList.toggle('hidden',!visible);
    open?.setAttribute('aria-expanded',String(visible));
    if (visible) close?.focus();
    else if (document.activeElement === close) open?.focus();
  };
  open?.addEventListener('click',()=>toggle(true));
  close?.addEventListener('click',()=>toggle(false));
  backdrop?.addEventListener('click',()=>toggle(false));
  document.addEventListener('keydown',e=>{if(e.key==='Escape')toggle(false);});
  const update = () => {
    const q = (search?.value || '').trim().toLocaleLowerCase('ja');
    let visible = 0;
    for (const item of items) {
      const match = (!category || item.dataset.source === category) &&
        (item.dataset.search || '').toLocaleLowerCase('ja').includes(q);
      item.hidden = !match;
      if (match) visible++;
    }
    if (selected) selected.textContent = category || 'すべてのコンテンツ';
    if (count) count.textContent = visible + ' 件 / 全 ' + items.length + ' 件';
    if (empty) empty.hidden = visible > 0;
    for (const button of buttons?.querySelectorAll('button') || []) {
      button.setAttribute('aria-current', String(button.dataset.category === category));
      button.classList.toggle('bg-panel-muted',button.dataset.category === category);
    }
    const url = new URL(location.href);
    if (category) url.searchParams.set('category',category);
    else url.searchParams.delete('category');
    history.replaceState(null,'',url);
  };
  search?.addEventListener('input',update);
  update();
})();
