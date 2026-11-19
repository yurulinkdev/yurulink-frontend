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
  const validSorts = ['newest','oldest','title-asc','title-desc','views-desc','views-asc'];
  let sort = validSorts.includes(new URL(location.href).searchParams.get('sort')) ? new URL(location.href).searchParams.get('sort') : 'newest';
  const pageSizeSelect = document.getElementById('page-size');
  const buttons = document.getElementById('category-buttons');
  const typeCheckboxes = [...document.querySelectorAll('#content-type-filter input[name="content-type"]')];
  const typeFilterDisclosure = document.getElementById('content-type-filter');
  const typeFilterStatus = document.getElementById('content-type-filter-status');
  const typeLabels = {video:'動画',playlist:'プレイリスト',short:'ショート',live:'ライブ'};
  const validTypes = ['video', 'playlist', 'short', 'live'];
  const parseTypes = query => new Set((query || '').split(',').filter(value => validTypes.includes(value)));
  const playlistTitle = document.getElementById('selected-category-title');
  const playlistTitleLink = document.getElementById('playlist-title-link');
  const viewButtons = [...document.querySelectorAll('[data-catalog-view]')];
  const params = new URL(location.href).searchParams;
  let category = params.get('category') || '';
  let selectedTypes = parseTypes(params.get('types'));
  typeCheckboxes.forEach(input => { input.checked = selectedTypes.has(input.value); });
  if (selectedTypes.size && typeFilterDisclosure) typeFilterDisclosure.open = true;
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
  // 関連付けは多対多。URLを再生成しても同じ分類を再現する。
  const categoryIds = item => (item.dataset.categoryIds || item.dataset.category || '').split(/\s+/).filter(Boolean);
  const records = items.map(item => ({
    item,
    ids: new Set(categoryIds(item)),
    query: (item.dataset.search || '').toLocaleLowerCase('ja'),
    title: item.dataset.title || '',
    published: Date.parse(item.dataset.publishedAt || ''),
    views: /^\d+$/.test(item.dataset.viewCount || '') ? Number(item.dataset.viewCount) : null,
    kind: item.dataset.kind || '',
    platform: item.dataset.platform || '',
    provenance: item.dataset.provenance || '',
    format: item.dataset.videoFormat || 'video',
    playlistId: item.dataset.playlistId || '',
    playlistChannelId: item.dataset.playlistChannelId || '',
    playlistChannelName: item.dataset.playlistChannelName || ''
  }));
  const categoryMetadata = new Map([...document.querySelectorAll('[data-category-definition]')].map(node => [
    node.dataset.categoryDefinition,
    {
      label: node.dataset.label || node.dataset.categoryDefinition,
      order: Number.isFinite(Number(node.dataset.order)) ? Number(node.dataset.order) : Number.MAX_SAFE_INTEGER,
      type: node.dataset.categoryType || '',
      kind: node.dataset.collectionKind || '',
      channelName: node.dataset.channelName || '',
      channelId: node.dataset.channelId || '',
      official: node.dataset.officialChannel === 'false' ? false : true
    }
  ]));
  const primaryMeta = new Map();
  for (const {item} of records) {
    if (item.dataset.category && !primaryMeta.has(item.dataset.category)) {
      primaryMeta.set(item.dataset.category, {
        label: item.dataset.categoryLabel || item.dataset.category,
        order: Number(item.dataset.categoryOrder) || Number.MAX_SAFE_INTEGER
      });
    }
  }
  const categories = [...new Set(records.flatMap(record => [...record.ids]))]
    .map(id => [id, categoryMetadata.get(id) || primaryMeta.get(id) || {label:id, order:Number.MAX_SAFE_INTEGER}])
    .sort((a,b) => a[1].order - b[1].order || a[1].label.localeCompare(b[1].label,'ja'));
  const categoryLabels = new Map(categories.map(([id, meta]) => [id, meta.label]));
  const virtualLabels = new Map([
    ['browse:video', 'YouTube動画（すべて）'],
    ['browse:playlists', 'プレイリスト（すべて）'],
    ['browse:short', 'ショート（すべて）'],
    ['browse:live', 'ライブ（すべて）'],
    ['browse:single', 'チャンネル・プレイリスト未所属の動画'],
    ['browse:social', 'SNSアカウント'],
    ['browse:web-official', '公式ウェブサイト'],
    ['browse:web-community', '非公式ウェブサイト'],
    ['browse:web-other', 'その他ウェブサイト']
  ]);
  // 再生種別は公開カタログのvideo_formatを優先する。推測で短尺動画をShortsと断定しない。
  const formatOf = record => record.kind === 'playlist' ? 'playlist'
    : record.kind === 'video' ? (record.format === 'short' || record.format === 'live' ? record.format : 'video')
    : 'other';
  const matchesType = record => !selectedTypes.size || selectedTypes.has(formatOf(record));
  const matchesCategory = (record, selectedCategory = category) => {
    if (!selectedCategory) return true;
    if (selectedCategory === 'browse:playlists') return record.kind === 'playlist';
    if (selectedCategory === 'browse:video') return record.kind === 'video' && record.platform === 'youtube';
    if (selectedCategory === 'browse:short') return formatOf(record) === 'short';
    if (selectedCategory === 'browse:live') return formatOf(record) === 'live';
    if (selectedCategory.startsWith('browse:playlists:')) {
      return record.kind === 'playlist' && record.playlistChannelId === selectedCategory.slice('browse:playlists:'.length);
    }
    if (selectedCategory.startsWith('browse:short:')) {
      const id = selectedCategory.slice('browse:short:'.length);
      return formatOf(record) === 'short' && record.ids.has(id);
    }
    if (selectedCategory.startsWith('browse:live:')) {
      const id = selectedCategory.slice('browse:live:'.length);
      return formatOf(record) === 'live' && record.ids.has(id);
    }
    // プレイリストそのものは一覧画面、個別プレイリストは所属動画を表示する。
    if (record.kind === 'playlist' && selectedCategory.startsWith('youtube-playlist:')) return false;
    if (record.ids.has(selectedCategory)) return true;
    if (selectedCategory === 'browse:single') return record.kind === 'video' && record.platform === 'youtube'
      && ![...record.ids].some(id => id.startsWith('youtube-channel:') || id.startsWith('youtube-playlist:'));
    if (selectedCategory === 'browse:social') return record.kind === 'social_profile';
    if (selectedCategory === 'browse:web-official') return record.kind === 'website' && record.provenance === 'official';
    if (selectedCategory === 'browse:web-community') return record.kind === 'website' && record.provenance === 'community';
    if (selectedCategory === 'browse:web-other') return record.kind === 'website' && record.provenance !== 'official' && record.provenance !== 'community';
    return false;
  };
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
  const makeGroup = (label, open = false) => {
    const details = document.createElement('details');
    details.open = open;
    details.className = 'mt-2';
    const summary = document.createElement('summary');
    summary.className = 'cursor-pointer rounded-lg px-3 py-2 text-sm font-semibold hover:bg-panel-muted';
    summary.textContent = label;
    const children = document.createElement('div');
    children.className = 'ml-3 border-l border-line pl-2';
    details.append(summary, children);
    return {details, children};
  };
  const appendVirtual = id => {
    if (records.some(record => matchesCategory(record, id))) buttons?.append(makeButton(virtualLabels.get(id), id));
  };
  // 全コンテンツの種類別横断表示は上部フィルタに集約し、重複したサイドバー項目を設けない。
  buttons?.append(makeButton('すべてのコンテンツ', ''));

  // Book1の収集対象に存在しない投稿元チャンネルは、リンク所属を維持したままナビから除外する。
  // 例えば関連プレイリストに含まれる他者の演奏動画を独立番組として表示しない。
  const channels = categories.filter(([id, meta]) => id.startsWith('youtube-channel:')
    && meta.official !== false && !/^YouTube channel UC[A-Za-z0-9_-]{22}$/.test(meta.label));
  const playlists = categories.filter(([id]) => id.startsWith('youtube-playlist:'));
  const channelByName = new Map();
  const normalize = label => label.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('ja');
  for (const [id, meta] of channels) {
    const name = normalize(meta.label);
    channelByName.set(name, [...(channelByName.get(name) || []), id]);
  }
  const nested = new Map(channels.map(([id]) => [id, []]));
  const ungrouped = [];
  const playlistChannels = new Map();
  for (const [id, meta] of playlists) {
    const explicit = meta.channelId ? 'youtube-channel:' + meta.channelId : '';
    const name = normalize(meta.channelName || '');
    const matches = explicit && nested.has(explicit) ? [explicit]
      : name ? channelByName.get(name) || [] : [];
    if (matches.length === 1) {
      nested.get(matches[0]).push([id, meta]);
      playlistChannels.set(id, matches[0]);
    } else {
      ungrouped.push([id, meta]);
    }
  }
  for (const record of records) {
    if (record.kind !== 'playlist') continue;
    const id = record.playlistId ? 'youtube-playlist:' + record.playlistId : '';
    const parent = playlistChannels.get(id);
    if (parent) record.playlistChannelId = parent;
  }

  if (channels.length) {
    const group = makeGroup('YouTubeチャンネル', true);
    for (const [id, meta] of channels) {
      const children = nested.get(id) || [];
      const channel = makeGroup(meta.label, category === id ||
        [`browse:playlists:${id}`,`browse:short:${id}`,`browse:live:${id}`].includes(category) ||
        children.some(([playlistId]) => playlistId === category));
      channel.details.classList.add('ml-1');
      channel.children.append(makeButton('動画', id));
      const playlistCategory = `browse:playlists:${id}`;
      categoryLabels.set(playlistCategory, meta.label + 'のプレイリスト');
      categoryLabels.set(`browse:short:${id}`, meta.label + 'のショート');
      categoryLabels.set(`browse:live:${id}`, meta.label + 'のライブ');
      const playlistGroup = makeGroup('プレイリスト', category === playlistCategory ||
        children.some(([playlistId]) => playlistId === category));
      // プレイリスト見出し自体を選んでも、リンク一覧へ切り替える。
      playlistGroup.details.querySelector('summary')?.addEventListener('click', () => {
        category = playlistCategory;
        page = 1;
        update();
      });
      playlistGroup.children.append(makeButton('プレイリスト一覧', playlistCategory));
      children.forEach(([playlistId, playlist]) => playlistGroup.children.append(makeButton(playlist.label, playlistId)));
      channel.children.append(playlistGroup.details);
      channel.children.append(makeButton('ショート', `browse:short:${id}`));
      channel.children.append(makeButton('ライブ', `browse:live:${id}`));
      group.children.append(channel.details);
    }
    buttons?.append(group.details);
  }
  if (ungrouped.length) {
    const group = makeGroup('その他のプレイリスト', ungrouped.some(([id]) => id === category));
    ungrouped.forEach(([id, meta]) => group.children.append(makeButton(meta.label, id)));
    buttons?.append(group.details);
  }
  appendVirtual('browse:single');
  // 「SNSアカウント」は「その他のカテゴリー > SNSプロフィール」と重複するためメニューから除外する。
  appendVirtual('browse:web-official');
  appendVirtual('browse:web-community');
  appendVirtual('browse:web-other');
  const known = new Set([...categories.filter(([id])=>id.startsWith('youtube-channel:')), ...playlists].map(([id]) => id));
  // kind由来の汎用「動画」も種類フィルタと重複するため、その他カテゴリには掲載しない。
  const other = categories.filter(([id]) => !known.has(id) && id !== 'video' && !id.startsWith('browse:'));
  if (other.length) {
    const group = makeGroup('その他のカテゴリー', other.some(([id]) => id === category));
    other.forEach(([id, meta]) => group.children.append(makeButton(meta.label, id)));
    buttons?.append(group.details);
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
        button.addEventListener('click', () => {
          page = target;
          update();
          // Keep the top pagination in view; scroll only when navigating from the bottom.
          if (pagination.id === 'pagination') {
            document.getElementById('pagination-top')?.scrollIntoView({ block: 'start', behavior: 'instant' });
          }
        });
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
  const compareItems = (a,b) => {
    if (sort === 'views-desc' || sort === 'views-asc') {
      // 非動画と未取得の再生数は、どちらの方向でも最後に配置する。
      const aValid = a.kind === 'video' && a.platform === 'youtube' && Number.isSafeInteger(a.views);
      const bValid = b.kind === 'video' && b.platform === 'youtube' && Number.isSafeInteger(b.views);
      if (aValid !== bValid) return aValid ? -1 : 1;
      if (aValid && a.views !== b.views) return sort === 'views-desc' ? b.views - a.views : a.views - b.views;
      return a.title.localeCompare(b.title, 'ja');
    }
    if (sort.startsWith('title-')) {
      const result = a.title.localeCompare(b.title, 'ja');
      return sort === 'title-asc' ? result : -result;
    }
    const left = a.published, right = b.published;
    if (!Number.isFinite(left) && !Number.isFinite(right)) return 0;
    if (!Number.isFinite(left)) return 1;
    if (!Number.isFinite(right)) return -1;
    return sort === 'oldest' ? left - right : right - left;
  };
  const update = () => {
    if (typeFilterStatus) {
      const labels = validTypes.filter(type => selectedTypes.has(type)).map(type => typeLabels[type]);
      typeFilterStatus.textContent = labels.length ? '選択中：' + labels.join('・') : 'すべて表示';
    }
    const q = (search?.value || '').trim().toLocaleLowerCase('ja');
    const matching = records.filter(record => matchesCategory(record) && matchesType(record) && record.query.includes(q)).sort(compareItems);
    const pages = Math.max(1, Math.ceil(matching.length/pageSize));
    page = Math.min(Math.max(1,page),pages);
    const visible = matching.slice((page-1)*pageSize,page*pageSize).map(record => record.item);
    const visibleSet = new Set(visible);
    items.forEach(item => {
      const hidden = !visibleSet.has(item);
      if (item.hidden !== hidden) item.hidden = hidden;
    });
    // 以前は全3,000件超のDOMを毎回移動していた。表示対象（最大100件）だけ並べ替える。
    const fragment = document.createDocumentFragment();
    visible.forEach(item => fragment.append(item));
    catalog.append(fragment);
    const label = categoryLabels.get(category) || virtualLabels.get(category)
      || (category.startsWith('browse:playlists:') ? 'プレイリスト一覧' : '')
      || (category.startsWith('browse:short:') ? 'ショート' : '')
      || (category.startsWith('browse:live:') ? 'ライブ' : '')
      || 'すべてのコンテンツ';
    if (playlistTitle) playlistTitle.textContent = label;
    else if (selected) selected.textContent = label;
    const playlistId = category.startsWith('youtube-playlist:') ? category.slice('youtube-playlist:'.length) : '';
    if (playlistTitle && playlistTitleLink) {
      const external = /^[A-Za-z0-9_-]{2,100}$/.test(playlistId);
      playlistTitle.hidden = external;
      playlistTitleLink.hidden = !external;
      if (external) {
        playlistTitleLink.textContent = label + ' ↗';
        playlistTitleLink.href = 'https://www.youtube.com/playlist?list=' + encodeURIComponent(playlistId);
      }
    }
    if (count) count.textContent = matching.length + ' 件 / 全 ' + items.length + ' 件';
    if (empty) empty.hidden = matching.length > 0 || items.length === 0;
    buttons?.querySelectorAll('button[data-category]').forEach(button => {
      button.setAttribute('aria-current', String(button.dataset.category === category));
      button.classList.toggle('bg-panel-muted', button.dataset.category === category);
    });
    renderPagination(pages);
    const url = new URL(location.href);
    for (const [key,value] of [['category',category],['q',q],['page',page===1?'':String(page)],['size',pageSize===20?'':String(pageSize)],['sort',sort==='newest'?'':sort],['types',validTypes.filter(value=>selectedTypes.has(value)).join(',')]]) {
      if (value) url.searchParams.set(key,value);
      else url.searchParams.delete(key);
    }
    history.replaceState(null,'',url);
  };
  typeCheckboxes.forEach(input => input.addEventListener('change', () => {
    selectedTypes = new Set(typeCheckboxes.filter(el => el.checked).map(el => el.value));
    page = 1;
    update();
  }));
  document.getElementById('reset-content-type-filter')?.addEventListener('click', () => {
    selectedTypes.clear();
    typeCheckboxes.forEach(input => { input.checked = false; });
    page = 1;
    update();
  });
  sortSelect?.addEventListener('change',()=>{sort=sortSelect.value;page=1;update();});
  search?.addEventListener('input',()=>{page=1;update();});
  pageSizeSelect?.addEventListener('change',()=>{pageSize=Number(pageSizeSelect.value);page=1;update();});
  window.addEventListener('popstate',()=>{
    const p = new URL(location.href).searchParams;
    category=p.get('category')||'';
    selectedTypes = parseTypes(p.get('types'));
    typeCheckboxes.forEach(input => { input.checked = selectedTypes.has(input.value); });
    if (selectedTypes.size && typeFilterDisclosure) typeFilterDisclosure.open = true;
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
