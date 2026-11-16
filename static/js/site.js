(() => {
  const catalog = document.getElementById('catalog');
  if (!catalog) return;
  const items = [...catalog.querySelectorAll('[data-catalog-item]')];
  const search = document.getElementById('query');
  const selected = document.getElementById('selected-category');
  const count = document.getElementById('count');
  const empty = document.getElementById('no-results');
  const paginations = [document.getElementById('pagination-top'), document.getElementById('pagination')].filter(Boolean);
  const sortSelect = document.getElementById('sort-order');
  const validSorts = ['newest','oldest','title-asc','title-desc'];
  let sort = validSorts.includes(new URL(location.href).searchParams.get('sort')) ? new URL(location.href).searchParams.get('sort') : 'newest';
  const pageSizeSelect = document.getElementById('page-size');
  const buttons = document.getElementById('category-buttons');
  const viewButtons = [...document.querySelectorAll('[data-catalog-view]')];
  const params = new URL(location.href).searchParams;
  let category = params.get('category') || '';
  let page = Math.max(1, Number.parseInt(params.get('page'), 10) || 1);
  let pageSize = [20,50,100].includes(Number(params.get('size'))) ? Number(params.get('size')) : 20;
  if (search) search.value = params.get('q') || '';
  if (sortSelect) sortSelect.value = sort;
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
    categories.filter(([id]) => id.startsWith('youtube-channel:')).forEach(([id,label]) => children.append(makeButton(label,id)));
    group.append(children);
    if (children.childElementCount) buttons?.append(group);
    categories.filter(([id]) => !id.startsWith('youtube-channel:')).forEach(([id,label]) => buttons?.append(makeButton(label,id)));
  }
  const renderPagination = pages => {
    for (const pagination of paginations) {
      pagination.replaceChildren();
      if (pages <= 1) continue;
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
    }
  };
  const timestamp = item => {
    const raw = item.dataset.publishedAt || '';
    const ms = Date.parse(raw);
    return Number.isFinite(ms) ? ms : null;
  };
  const compareItems = (a,b) => {
    if (sort.startsWith('title-')) {
      const result = (a.dataset.title || '').localeCompare(b.dataset.title || '', 'ja');
      return sort === 'title-asc' ? result : -result;
    }
    const left = timestamp(a), right = timestamp(b);
    if (left === null && right === null) return 0;
    if (left === null) return 1;
    if (right === null) return -1;
    return sort === 'oldest' ? left - right : right - left;
  };
  const update = () => {
    const q = (search?.value || '').trim().toLocaleLowerCase('ja');
    const matching = items.filter(item => (!category || item.dataset.category === category) && (item.dataset.search || '').toLocaleLowerCase('ja').includes(q)).sort(compareItems);
    matching.forEach(item => catalog.append(item));
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
    for (const [key,value] of [['category',category],['q',q],['page',page===1?'':String(page)],['size',pageSize===20?'':String(pageSize)],['sort',sort==='newest'?'':sort]]) {
      if (value) url.searchParams.set(key,value);
      else url.searchParams.delete(key);
    }
    history.replaceState(null,'',url);
  };
  sortSelect?.addEventListener('change',()=>{sort=sortSelect.value;page=1;update();});
  search?.addEventListener('input',()=>{page=1;update();});
  pageSizeSelect?.addEventListener('change',()=>{pageSize=Number(pageSizeSelect.value);page=1;update();});
  window.addEventListener('popstate',()=>{
    const p = new URL(location.href).searchParams;
    category=p.get('category')||'';
    sort=validSorts.includes(p.get('sort')) ? p.get('sort') : 'newest';
    if (sortSelect) sortSelect.value=sort;
    if (search) search.value=p.get('q')||'';
    page=Math.max(1,Number.parseInt(p.get('page'),10)||1);
    pageSize=[20,50,100].includes(Number(p.get('size'))) ? Number(p.get('size')) : 20;
    if (pageSizeSelect) pageSizeSelect.value=String(pageSize);
    update();
  });
  update();
})();
