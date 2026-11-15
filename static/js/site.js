(() => {
  const catalog = document.getElementById('catalog');
  if (!catalog) return;
  const items = [...catalog.querySelectorAll('[data-catalog-item]')];
  const search = document.getElementById('query');
  const selected = document.getElementById('selected-category');
  const count = document.getElementById('count');
  const empty = document.getElementById('no-results');
  const pagination = document.getElementById('pagination');
  const pageSizeSelect = document.getElementById('page-size');
  const buttons = document.getElementById('category-buttons');
  const viewButtons = [...document.querySelectorAll('[data-catalog-view]')];
  const params = new URL(location.href).searchParams;
  let category = params.get('category') || '';
  let page = Math.max(1, Number.parseInt(params.get('page'), 10) || 1);
  let pageSize = [20,50,100].includes(Number(params.get('size'))) ? Number(params.get('size')) : 20;
  if (search) search.value = params.get('q') || '';
  if (pageSizeSelect) pageSizeSelect.value = String(pageSize);
  const viewKey = 'yurulink-catalog-view';
  const applyView = value => {
    const view = value === 'list' ? 'list' : 'grid';
    catalog.classList.toggle('catalog-list-view', view === 'list');
    viewButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.catalogView === view)));
  };
  let initialView = 'grid';
  try { initialView = localStorage.getItem(viewKey) || 'grid'; } catch { /* storage disabled */ }
  applyView(initialView);
  viewButtons.forEach(button => button.addEventListener('click', () => {
    applyView(button.dataset.catalogView);
    try { localStorage.setItem(viewKey, button.dataset.catalogView); } catch { /* storage disabled */ }
  }));
  const categories = [...new Map(items.filter(x => x.dataset.category).map(x => [x.dataset.category, x.dataset.categoryLabel || x.dataset.category])).entries()].sort((a,b)=>a[1].localeCompare(b[1],'ja'));
  const makeButton = (label, value) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-panel-muted focus-visible:outline';
    button.textContent = label;
    button.dataset.category = value;
    button.addEventListener('click', () => {
      category = value;
      page = 1;
      update();
      document.getElementById('close-categories')?.click();
    });
    return button;
  };
  buttons?.append(makeButton('すべてのコンテンツ', ''));
  if (categories.length) {
    const group = document.createElement('details');
    group.open = true;
    group.className = 'mt-2';
    const summary = document.createElement('summary');
    summary.className = 'cursor-pointer rounded-lg px-3 py-2 text-sm font-semibold hover:bg-panel-muted';
    summary.textContent = 'YouTubeチャンネル';
    group.append(summary);
    const children = document.createElement('div');
    children.className = 'ml-3 border-l border-line pl-2';
    categories.forEach(([id,label]) => children.append(makeButton(label,id)));
    group.append(children);
    buttons?.append(group);
  }
  const renderPagination = pages => {
    if (!pagination) return;
    pagination.replaceChildren();
    if (pages <= 1) return;
    const add = (label, target, disabled = false, current = false) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.disabled = disabled;
      button.className = 'rounded-lg border border-line px-3 py-1.5 text-sm disabled:opacity-40';
      if (current) button.setAttribute('aria-current', 'page');
      button.addEventListener('click', () => { page = target; update(); catalog.scrollIntoView({block:'start',behavior:'instant'}); });
      pagination.append(button);
    };
    add('前へ', page - 1, page === 1);
    const visible = new Set([1,pages,page-2,page-1,page,page+1,page+2].filter(n=>n>=1&&n<=pages));
    let previous = 0;
    for (const n of [...visible].sort((a,b)=>a-b)) {
      if (n > previous + 1) {
        const dots = document.createElement('span');
        dots.textContent = '…';
        dots.setAttribute('aria-hidden','true');
        pagination.append(dots);
      }
      add(String(n),n,false,n===page);
      previous=n;
    }
    add('次へ', page + 1, page === pages);
  };
  const update = () => {
    const q = (search?.value || '').trim().toLocaleLowerCase('ja');
    const matching = items.filter(item => (!category || item.dataset.category === category) && (item.dataset.search || '').toLocaleLowerCase('ja').includes(q));
    const pages = Math.max(1, Math.ceil(matching.length/pageSize));
    page = Math.min(Math.max(1,page),pages);
    const visible = new Set(matching.slice((page-1)*pageSize,page*pageSize));
    items.forEach(item => { item.hidden = !visible.has(item); });
    if (selected) selected.textContent = categories.find(([id])=>id===category)?.[1] || 'すべてのコンテンツ';
    if (count) count.textContent = matching.length + ' 件 / 全 ' + items.length + ' 件';
    if (empty) empty.hidden = matching.length > 0 || items.length === 0;
    buttons?.querySelectorAll('button[data-category]').forEach(button => {
      button.setAttribute('aria-current',String(button.dataset.category===category));
      button.classList.toggle('bg-panel-muted',button.dataset.category===category);
    });
    renderPagination(pages);
    const url = new URL(location.href);
    for (const [key,value] of [['category',category],['q',q],['page',page===1?'':String(page)],['size',pageSize===20?'':String(pageSize)]]) {
      if (value) url.searchParams.set(key,value);
      else url.searchParams.delete(key);
    }
    history.replaceState(null,'',url);
  };
  search?.addEventListener('input',()=>{page=1;update();});
  pageSizeSelect?.addEventListener('change',()=>{pageSize=Number(pageSizeSelect.value);page=1;update();});
  window.addEventListener('popstate',()=>{
    const p = new URL(location.href).searchParams;
    category=p.get('category')||'';
    if (search) search.value=p.get('q')||'';
    page=Math.max(1,Number.parseInt(p.get('page'),10)||1);
    pageSize=[20,50,100].includes(Number(p.get('size'))) ? Number(p.get('size')) : 20;
    if (pageSizeSelect) pageSizeSelect.value=String(pageSize);
    update();
  });
  update();
})();
