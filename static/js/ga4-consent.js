/* GA4計測は利用者の同意後のみ開始。測定IDは公開設定値であり秘密情報ではない。 */
(() => {
  const section = document.getElementById('analytics-consent');
  if (!section) return;
  const id = section.dataset.ga4Id || '';
  if (!/^G-[A-Z0-9]+$/.test(id)) return;
  const allowedHosts = (section.dataset.allowedHostnames || '').split(',').map(value => value.trim()).filter(Boolean);
  // Production専用ストリームへのStaging混入防止。任意のhostname制限はhugo.tomlで設定。
  if (allowedHosts.length && !allowedHosts.includes(location.hostname)) return;
  const key = 'yurulink-ga4-consent-v1';
  const message = section.querySelector('p');
  const allow = document.getElementById('analytics-allow');
  const deny = document.getElementById('analytics-deny');
  const change = document.getElementById('analytics-change');
  let started = false;
  let state = '';
  try { state = localStorage.getItem(key) || ''; } catch { /* 保存不可時は未同意扱い */ }
  const start = () => {
    if (started) return;
    started = true;
    window.dataLayer = window.dataLayer || [];
    function gtag(){ window.dataLayer.push(arguments); }
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', id, { anonymize_ip: true });
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
    document.head.append(script);
  };
  const render = () => {
    section.hidden = false;
    const chosen = state === 'allow' || state === 'deny';
    message.textContent = chosen
      ? ('Google Analyticsの計測設定：' + (state === 'allow' ? '同意済み' : '同意しない'))
      : 'サイト改善のためGoogle Analyticsを利用します。ご同意のときだけ計測します。';
    allow.hidden = chosen; deny.hidden = chosen; change.hidden = !chosen;
  };
  const save = value => {
    const prev = state;
    state = value;
    try { localStorage.setItem(key, value); } catch { /* 保存不可でも現在の選択は尊重 */ }
    if (value === 'allow') start();
    if (prev === 'allow' && value === 'deny') { location.reload(); return; }
    render();
  };
  allow?.addEventListener('click', () => save('allow'));
  deny?.addEventListener('click', () => save('deny'));
  change?.addEventListener('click', () => { state = ''; render(); });
  if (state === 'allow') start();
  render();
})();