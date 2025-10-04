// app_full.js — SPA 엔트리 (동적 DATA 로드 + 안전한 검색 인덱스 + 헤더/네비/카드/가로스크롤/가드)

import { state, saveState, $app, sha256 } from './js/state.js';
import { navigate, onRouteChange } from './js/router.js';
import {
  View_index, View_esports, View_basketball, View_football,
  View_news, View_matches, View_store, View_search,
  View_cart, View_login, View_signup
} from './js/views-full.js';
// ⚠️ 정적 import { DATA } 제거! 동적 로드로 대체합니다.

/* ========================================
   레거시 파일명 → 라우트 매핑
======================================== */
const fileToRoute = {
  'index.html': 'home',
  'store.html': 'store',
  'cart.html': 'cart',
  'login.html': 'login',
  'signup.html': 'signup',
  'search.html': 'search',
  'esports.html': 'esports',
  'basketball.html': 'basketball',
  'football.html': 'football',
  'news.html': 'news',
  'matches.html': 'matches',
};

/* ========================================
   라우트/쿼리 파서 (해시 기반)
======================================== */
function routeOnly() {
  const h = (location.hash || '').replace(/^#\/?/, '');
  return (h.split('?')[0] || 'home');
}
function parseHashQuery() {
  const q = (location.hash.split('?')[1] || '');
  const params = new URLSearchParams(q);
  return Object.fromEntries(params.entries());
}

/* ========================================
   홈 카드 → 카테고리 자동 매핑 유틸
======================================== */
const KWD_TO_ROUTE = [
  { kws: ['e스포츠','esports','e-sports','e sport','faker','t1'], route: 'esports' },
  { kws: ['농구','basketball','nba','lebron','curry'],           route: 'basketball' },
  { kws: ['축구','football','soccer','epl','손흥민','son'],       route: 'football' },
  { kws: ['뉴스','news'],                                        route: 'news' },
  { kws: ['경기','일정','matches','schedule','fixtures'],        route: 'matches' },
  { kws: ['스토어','store','쇼핑','shop'],                       route: 'store' },
];
const textOf = el => (el?.textContent || el?.getAttribute?.('aria-label') || '').trim().toLowerCase();

// 뉴스 컨텍스트(뉴스 섹션/뉴스 제목 등) 여부 판정
function __isNewsContainer(el){
  if (!el) return false;
  const sec = el.closest('section, .section, [data-section], #news, .news');
  if (!sec) return false;
  const meta = [
    sec.id || '',
    sec.className || '',
    sec.getAttribute && (sec.getAttribute('data-section') || ''),
    sec.getAttribute && (sec.getAttribute('data-cat') || ''),
    sec.getAttribute && (sec.getAttribute('data-link') || '')
  ].join(' ').toLowerCase();
  if (/news|\uB274\uC2A4/.test(meta)) return true; // '뉴스'
  const head = sec.querySelector && sec.querySelector('h1,h2,h3,.section-title,.title,.header');
  const headText = (head && (head.textContent || '')).toLowerCase();
  if (/ens\s*\uC2E4\uC2DC\uAC04\s*\uB274\uC2A4\uD53D|news|\uB274\uC2A4/.test(headText)) return true;
  return false;
}
function guessRouteFromText(s=''){ const t=s.toLowerCase(); for(const {kws,route} of KWD_TO_ROUTE){ if(kws.some(k=>t.includes(k))) return route; } return null; }
function mapHomeCardToRoute(card){
  if (__isNewsContainer(card)) return 'news';
  const explicit = card.getAttribute('data-link') || card.getAttribute('data-category');
  if (explicit && explicit !== 'home') return explicit;
  const titleEl = card.querySelector('h1,h2,h3,h4,.title,.card-title');
  const sectionTitle = card.closest('section,.section,.row-shell')?.querySelector('h2,h3,.section-title');
  const imgAlt = card.querySelector('img')?.getAttribute('alt') || '';
  return guessRouteFromText(textOf(card)) ||
         guessRouteFromText(textOf(titleEl)) ||
         guessRouteFromText(textOf(sectionTitle)) ||
         guessRouteFromText(imgAlt) || null;
}

/* ========================================
   동적 DATA 로드 + 검색 인덱스 (DATA/레거시/마크업 흡수)
======================================== */
let SEARCH_INDEX = null;

function normalize(s='') { return s.toString().toLowerCase().normalize('NFKC').trim(); }
const get = (o, keys, fb='') => { if (!o) return fb; for (const k of keys) if (o[k]!=null) return o[k]; return fb; };

// DATA를 동적으로 가져오기 (없으면 전역 → 빈 객체 순)
async function loadDATA() {
  try {
    const mod = await import('./js/data.js'); // 존재하면 로드
    return mod?.DATA ?? {};
  } catch {
    try { return (window.DATA || window.SEARCH_DATA || {}); } catch { return {}; }
  }
}

// 1) JS 데이터에서 인덱스 구성(레거시 전역 포함)
function classifyFromText(t){
  if (!t) return { cat:null, route:null };
  const s = t.toLowerCase();
  if (/(lol|league of legends|t1|faker|lck)/.test(s))     return { cat:'lol',  route:'esports' };
  if (/(nba|lakers|warriors|bucks|celtics|basketball)/.test(s)) return { cat:'nba',  route:'basketball' };
  if (/(epl|tottenham|arsenal|liverpool|맨시티|손흥민|son)/.test(s)) return { cat:'epl',  route:'football' };
  return { cat:null, route:null };
}

async function buildIndexFromDATA() {
  const out = [];
  let PR = [], P = [], N = [];

  try {
    const DATA = await loadDATA();
    PR = DATA.products || DATA.items || DATA.catalog || PR;
    P  = DATA.players  || DATA.athletes || P;
    N  = DATA.news     || DATA.articles || DATA.posts || N;
  } catch {}

  try {
    const g = (window.SEARCH_DATA || window.searchData || window);
    if (!P.length  && g && (g.players  || g.athletes))   P  = g.players  || g.athletes;
    if (!N.length  && g && (g.news     || g.articles || g.posts)) N = g.news || g.articles || g.posts;
    if (!PR.length && g && (g.products || g.items    || g.catalog)) PR = g.products || g.items || g.catalog;
  } catch {}

  // 상품 → 스토어
  PR.forEach(p => {
    const title = get(p,['title','name','label','headline'],'');
    const text  = normalize([title, get(p,['desc','description','body','detail'],'')].join(' '));
    out.push({
      type:'product', cat:'store', route:'store',
      id:   get(p,['id','sku','code'],''),
      title, price:Number(get(p,['price','cost','amount'],0))||0,
      text
    });
  });

  // 선수 → 텍스트로 종목 추정(LOL/NBA/EPL)
  P.forEach(pl => {
    const title = get(pl,['name','nameKo','nickname','displayName'],'');
    const meta  = [get(pl,['team','club','teamName'],''),
                   get(pl,['pos','position'],'')].filter(Boolean).join(' · ');
    const text  = normalize([title, meta].join(' '));
    const {cat,route} = classifyFromText(text);
    out.push({
      type:'player', cat, route,
      id:   get(pl,['id','code','slug'],''),
      title, meta, text
    });
  });

  // 뉴스 → news
  N.forEach(n => {
    const title = get(n,['title','headline'],'');
    const date  = get(n,['date','pubDate','publishedAt'],'');
    const text  = normalize([title, get(n,['summary','excerpt','body','content'],'')].join(' '));
    out.push({
      type:'news', cat:'news', route:'news',
      id:get(n,['id','slug'],''), title, date, text
    });
  });

  return out;
}


// 2) 각 페이지 마크업에서 추출(데이터가 없어도 동작)
function buildIndexFromViews() {
  const out = [];
  const parse = (html, cat, route) => {
    if (!html) return;
    const tpl = document.createElement('template'); tpl.innerHTML = html;
    const root = tpl.content;

    // 상품
    root.querySelectorAll('article.card, .product-card, article.product, [data-product-id]').forEach(el=>{
      const title = el.querySelector('h3,h4,.title')?.textContent?.trim() || '';
      const priceText = el.querySelector('.price')?.textContent || '';
      const price = parseInt((priceText.match(/[0-9,]+/)||['0'])[0].replace(/,/g,''),10)||0;
      out.push({
        type:'product', cat: 'store', route: 'store',
        id: el.getAttribute('data-id')||title.toLowerCase(),
        title, price,
        text: normalize([title, priceText].join(' '))
      });
    });

    // 선수
    root.querySelectorAll([
      '.player-card','.athlete-card','.player','.card.player',
      '[data-player-id]','[data-player-name]'
    ].join(',')).forEach(el=>{
      const title = el.getAttribute('data-player-name')
                 || el.querySelector('h2,h3,h4,.title,.name')?.textContent?.trim() || '';
      const meta  = el.getAttribute('data-team')
                 || el.querySelector('.muted,.meta,.team')?.textContent?.trim() || '';
      out.push({
        type:'player', cat, route,
        id: (el.getAttribute('data-player-id')||title.toLowerCase()),
        title, meta,
        text: normalize([title, meta].join(' '))
      });
    });

    // 뉴스
    root.querySelectorAll('.news-card, article.news, .post-card, [data-type="news"]').forEach(el=>{
      const title = el.querySelector('h3,h4,.title')?.textContent?.trim() || '';
      const date  = el.querySelector('.date,.muted')?.textContent?.trim() || '';
      out.push({
        type:'news', cat: 'news', route: 'news',
        id: title.toLowerCase(), title, date,
        text: normalize([title, date].join(' '))
      });
    });
  };

  // 각 화면에서 긁어오되 카테고리/라우트 힌트를 같이 준다
  try { parse(View_esports?.(),    'lol',  'esports'); }   catch {}
  try { parse(View_basketball?.(), 'nba',  'basketball'); }catch {}
  try { parse(View_football?.(),   'epl',  'football'); }  catch {}
  try { parse(View_news?.(),       'news', 'news'); }      catch {}
  try { parse(View_store?.(),      'store','store'); }     catch {}
  try { parse(View_index?.(),      null,    null); }       catch {}
  return out;
}


async function ensureSearchIndex(force=false) {
  if (!force && SEARCH_INDEX) return SEARCH_INDEX;
  try {
    const fromData = await buildIndexFromDATA();
    SEARCH_INDEX = fromData.length ? fromData : buildIndexFromViews();
  } catch (err) {
    console.error('[search-index] build failed:', err);
    SEARCH_INDEX = buildIndexFromViews(); // 최후 폴백
  }
  return SEARCH_INDEX;
}

/* ========================================
   헤더 렌더 (styles.css 호환 + 네비 중앙정렬 + 검색 연결)
======================================== */
function mountHeader() {
  const cartCount = state.cart.reduce((s, i) => s + (i.qty || 0), 0);

  const html = `
    <header class="site-header">
      <div class="inner header-top row-compact">
        <a class="logo" href="#/home" data-link="home" aria-label="ENS 홈">ENS<span>Sports</span></a>

        <form class="site-search" id="siteSearchForm" onsubmit="return false">
          <input type="search" name="q" id="siteSearchInput" placeholder="검색 (선수, 뉴스, 팀, 상품…)" autocomplete="off" />
          <button type="button" class="button primary" data-link="search" id="siteSearchBtn">검색</button>
        </form>

        <div class="auth-controls">
          ${
            state.session
            ? `
              <button class="user-chip" disabled>안녕하세요, <b>${state.session.username}</b>님</button>
              <a class="button ghost" href="#/cart" data-link="cart">장바구니 (${cartCount})</a>
              <button class="button secondary" data-action="logout">로그아웃</button>
            `
            : `
              <a class="button primary" href="#/login" data-link="login">로그인</a>
              <a class="button ghost" href="#/signup" data-link="signup">회원가입</a>
            `
          }
        </div>
      </div>
      <div class="inner nav-line">
        <nav class="site-nav site-nav--centered">
          <a href="#/esports"    data-link="esports">리그 오브 레전드</a>
          <a href="#/basketball" data-link="basketball">NBA</a>
          <a href="#/football"   data-link="football">EPL</a>
          <a href="#/news"       data-link="news">뉴스</a>
          <a href="#/matches"    data-link="matches">경기 결과</a>
          <a href="#/store"      data-link="store">스토어</a>
        </nav>
      </div>
      <div class="nav-divider"></div>
    </header>
  `;

  const old = document.querySelector('header.site-header'); if (old) old.remove();
  document.body.insertAdjacentHTML('afterbegin', html);
  injectHeaderStyles();
  setActiveNav();
  wireSearch();
}
function injectHeaderStyles() {
  if (document.getElementById('headerCenterPatch')) return;
  const style = document.createElement('style');
  style.id = 'headerCenterPatch';
  style.textContent = `
    /* 네비 줄을 CSS Grid로 만들어 중앙 슬롯에 고정 */
    header.site-header .nav-line{
      display:grid !important;
      grid-template-columns: 1fr auto 1fr;
      align-items:center;
      padding:0; /* 기존 패딩이 치우치게 만들면 제거 */
    }
    header.site-header .nav-line .site-nav{
      grid-column:2; /* 가운데 칸 */
      justify-self:center;
      display:inline-flex !important;
      gap:28px;
      margin:0;
    }

    /* 기존 전역 규칙 무력화(정렬/마진/밑줄) */
    header.site-header .nav-line .site-nav a{
      margin:0 !important;
      padding:10px 2px;
      text-decoration:none;
      border-bottom:none !important;
    }
    header.site-header .nav-line .site-nav a + a{
      margin-left:0 !important; /* 전역 a+a 간격 제거 */
    }
    header.site-header .nav-line .site-nav a[aria-current="page"]{
      border-bottom:none !important;
    }
  `;
  document.head.appendChild(style);
}

function setActiveNav(){
  const r = routeOnly();
  document.querySelectorAll('.site-nav a').forEach(a => {
    const link = a.getAttribute('data-link');
    a.setAttribute('aria-current', link === r ? 'page' : '');
  });
}
function wireSearch(){
  const form  = document.getElementById('siteSearchForm');
  const input = document.getElementById('siteSearchInput');
  const btn   = document.getElementById('siteSearchBtn');
  if (!form || !input) return;
  const go = () => {
    const q = (input.value || '').trim();
    location.hash = '#/search' + (q ? `?q=${encodeURIComponent(q)}` : '');
  };
  form.addEventListener('submit', (e)=>{ e.preventDefault(); go(); });
  btn?.addEventListener('click', (e)=>{ e.preventDefault(); go(); });
  input.addEventListener('keydown', (e)=>{ if (e.key === 'Enter') { e.preventDefault(); go(); } });
}

/* ========================================
   검색 결과 렌더 (호환 인덱스 사용)
======================================== */
function renderSearchResults(q){
  const { tab = 'all' } = parseHashQuery();          // 탭 파라미터
  const idx = SEARCH_INDEX || [];
  const term = normalize(q);
  let matched = term ? idx.filter(it => it.text.includes(term)) : [];

  // 탭 필터
  const tabMap = {
    all:   {label:'전체',   pred:()=>true},
    lol:   {label:'LoL',    pred:(it)=>it.cat==='lol'},
    nba:   {label:'NBA',    pred:(it)=>it.cat==='nba'},
    epl:   {label:'EPL',    pred:(it)=>it.cat==='epl'},
    news:  {label:'뉴스',   pred:(it)=>it.cat==='news'},
    match: {label:'경기',   pred:(it)=>it.cat==='matches'},  // 필요시 확장
    store: {label:'스토어', pred:(it)=>it.cat==='store'},
  };
  if (tabMap[tab]) matched = matched.filter(tabMap[tab].pred);

  // 카테고리 칩 라벨
  const chip = (it) => {
    switch (it.cat) {
      case 'lol':  return 'LOL';
      case 'nba':  return 'NBA';
      case 'epl':  return 'EPL';
      case 'news': return 'NEWS';
      case 'store':return 'STORE';
      default:     return (it.type||'').toUpperCase();
    }
  };

  // 탭 UI
  const tabs = Object.entries(tabMap).map(([k,v])=>{
    const active = (k===tab) ? 'aria-current="true"' : '';
    const href   = `#/search?q=${encodeURIComponent(q)}&tab=${k}`;
    return `<a class="pill" ${active} href="${href}">${v.label}</a>`;
  }).join(' ');

  // 결과 카드(2번째 스샷 스타일)
  const cards = matched.map(it=>{
    const subtitle = it.type==='player' ? (it.meta||'') :
                     it.type==='news'   ? (it.date||'') :
                     it.type==='product'? ( (it.price||0).toLocaleString('ko-KR') + '원') : '';
    const goRoute  = it.route || (it.cat==='store' ? 'store' :
                     it.cat==='lol' ? 'esports' :
                     it.cat==='nba' ? 'basketball' :
                     it.cat==='epl' ? 'football' :
                     it.cat==='news'? 'news' : 'home');

    return `
      <article class="card result-card">
        <div class="pill small">${chip(it)}</div>
        <h3 class="title">${it.title}</h3>
        ${subtitle ? `<p class="muted">${subtitle}</p>` : ''}
        <div class="row" style="justify-content:flex-end">
          <a class="button ghost" data-link="${goRoute}">바로가기</a>
        </div>
      </article>
    `;
  }).join('');

  const totalText = `${matched.length}건 검색됨`;

  return `
    <section class="section">
      <div class="inner">
        <h1>검색 결과</h1>
        <p class="muted">검색어: ${q || '(전체)'}</p>
        <div class="tabs">${tabs}</div>
        <p class="muted" style="margin-top:12px">${totalText}</p>
      </div>
    </section>

    <section class="section">
      <div class="inner">
        ${cards || `<p class="muted">결과가 없습니다.</p>`}
      </div>
    </section>
  `;
}

/* ========================================
   렌더러 + 장바구니 라우트 가드
======================================== */
async function render() {
  const r = routeOnly();

  if (r === 'cart' && !state.session) {
    alert('장바구니는 로그인 후 이용 가능합니다.');
    navigate('login'); return;
  }

  let body = '';
  if (r === 'search') {
    await ensureSearchIndex(true); // 검색 진입 시 최신 인덱스로 리빌드
    const { q = '' } = parseHashQuery();
    body = renderSearchResults(q);
  } else {
    switch (r) {
      case 'home':       body = View_index(); break;
      case 'esports':    body = View_esports?.() || View_index(); break;
      case 'basketball': body = View_basketball?.() || View_index(); break;
      case 'football':   body = View_football?.() || View_index(); break;
      case 'news':       body = View_news?.() || View_index(); break;
      case 'matches':    body = View_matches?.() || View_index(); break;
      case 'store':      body = View_store?.() || View_index(); break;
      case 'cart':       body = View_cart?.() || View_index(); break;
      case 'login':      body = View_login?.() || View_index(); break;
      case 'signup':     body = View_signup?.() || View_index(); break;
      default:           body = View_index(); break;
    }
  }

  $app().innerHTML = body;

  patchLegacyLinks();   // *.html → #/route 변환
  enhanceActions();     // 원본 버튼/링크 → SPA 표준 속성 부여
  mountHeader();        // 헤더 주입 + 중앙정렬
  initRowScrolls();     // 가로 스크롤 초기화

  // 홈 카드: 카테고리 라우트 자동 태깅
  if (routeOnly() === 'home') {
    document.querySelectorAll(
      '.card, .product-card, article.product, .category-card, .player-card, .news-card, .match-card'
    ).forEach(card => {
      if (card.getAttribute('data-link')) return;
      const route = mapHomeCardToRoute(card);
      if (route) card.setAttribute('data-link', route);
    });
  }
}
onRouteChange(() => { render(); });

/* ========================================
   *.html → #/route 자동 변환
======================================== */
function patchLegacyLinks() {
  document.querySelectorAll('a[href$=".html"]').forEach(a=>{
    const href=a.getAttribute('href')||''; const file=href.split('/').pop().toLowerCase(); const route=fileToRoute[file];
    if (route){ a.setAttribute('href', `#/${route}`); a.setAttribute('data-link', route); }
  });
  document.querySelectorAll('form[action$=".html"]').forEach(f=>{
    const act=f.getAttribute('action')||''; const file=act.split('/').pop().toLowerCase(); const route=fileToRoute[file];
    if (route){ f.setAttribute('data-link', route); f.removeAttribute('action'); }
  });
  document.querySelectorAll('[data-nav]').forEach(el=>{
    const r=(el.getAttribute('data-nav')||'').trim(); if (r) el.setAttribute('data-link', r);
  });
}

/* ========================================
   원본 버튼/링크 → SPA 표준 속성 부여
======================================== */
function enhanceActions() {
  document.querySelectorAll('a[href$="store.html"], [data-nav="store"]').forEach(el=>el.setAttribute('data-link','store'));
  document.querySelectorAll('a[href$="cart.html"], [data-nav="cart"]').forEach(el=>el.setAttribute('data-link','cart'));
  document.querySelectorAll('a[href$="login.html"], [data-nav="login"]').forEach(el=>el.setAttribute('data-link','login'));
  document.querySelectorAll('a[href$="signup.html"], [data-nav="signup"]').forEach(el=>el.setAttribute('data-link','signup'));
  document.querySelectorAll('a[href$="index.html"], [data-nav="home"], .logo').forEach(el=>el.setAttribute('data-link','home'));

  // 장바구니/구매 버튼
  document.querySelectorAll('[data-add-to-cart], .add-to-cart, button.add-cart, button[data-role="add-cart"]').forEach(btn=>{
    const card=btn.closest('[data-id]')||btn.closest('[data-product-id]');
    const pid=(card?.getAttribute('data-id')||card?.getAttribute('data-product-id')||'').trim();
    if (pid){ btn.setAttribute('data-action','add-to-cart'); btn.setAttribute('data-id', pid); }
  });
  document.querySelectorAll('[data-buy-now], .buy-now, button.buy-now').forEach(btn=>{
    const card=btn.closest('[data-id]')||btn.closest('[data-product-id]');
    const pid=(card?.getAttribute('data-id')||card?.getAttribute('data-product-id')||'').trim();
    if (pid){ btn.setAttribute('data-action','buy-now'); btn.setAttribute('data-id', pid); }
  });
}

/* ========================================
   도우미: 인터랙티브 요소 체크
======================================== */
const isInteractive = el => !!el.closest('a, button, input, select, textarea, label, [contenteditable], [role="button"], [role="link"]');

/* ========================================
   전역 클릭/폼 위임
======================================== */
document.addEventListener('click', (e) => {
  // 1) 레거시 a[href="*.html"] → SPA 라우팅
  const legacyA = e.target.closest('a[href$=".html"]');
  if (legacyA) {
    const href=legacyA.getAttribute('href')||''; const file=href.split('/').pop().toLowerCase(); const route=fileToRoute[file];
    if (route){ e.preventDefault(); navigate(route); return; }
  }

  // 2) data-link 라우팅
  const link = e.target.closest('[data-link]');
  if (link) {
    e.preventDefault();
    const to = link.getAttribute('data-link');
    if (to === 'cart' && !state.session) { alert('장바구니는 로그인 후 이용 가능합니다.'); navigate('login'); return; }
    navigate(to); return;
  }

  // 3) 카드 전체 클릭 (홈이면 카테고리로)
  const card = e.target.closest('.card, .product-card, article.product, .category-card, .player-card, .news-card, .match-card');
  if (card && !isInteractive(e.target)) {
    e.preventDefault();
    let to = card.getAttribute('data-link');
    if (routeOnly() === 'home' && (!to || to === 'home')) to = mapHomeCardToRoute(card);
    if (!to) {
      const firstLinkEl = card.querySelector('[data-link]') || card.querySelector('a[href^="#/"]') || card.querySelector('a[href$=".html"]');
      if (firstLinkEl) {
        const href=firstLinkEl.getAttribute('href')||'';
        if (href.endsWith('.html')){ const file=href.split('/').pop().toLowerCase(); const route=fileToRoute[file]; if (route){ navigate(route); return; } }
        to = firstLinkEl.getAttribute('data-link') || href.replace(/^#\//,'');
      }
    }
    if (to){ navigate(to); return; }
  }

  // 4) 장바구니/구매/로그아웃
  const el = e.target.closest('[data-action]'); if (!el) return;
  const action = el.getAttribute('data-action'); const id = el.getAttribute('data-id');

  if (action === 'logout') {
    state.session = null; saveState(); render(); return;
  }

  if (action === 'add-to-cart' || action === 'buy-now') {
    if (!state.session){ alert('로그인 후 이용 가능합니다.'); navigate('login'); return; }
    const container = el.closest('[data-id], [data-title], [data-price], article, .card, .product');
    let pid = id || container?.getAttribute('data-id') || '';
    let title = el.getAttribute('data-title') || container?.getAttribute('data-title') || container?.querySelector('h3,h4,.title')?.textContent?.trim() || '상품';
    let price = parseInt(el.getAttribute('data-price') || container?.getAttribute('data-price') || (container?.querySelector('.price')?.textContent || '').replace(/[^0-9]/g,'' ) || '0', 10) || 0;
    let img = container?.getAttribute('data-img') || container?.querySelector('img')?.getAttribute('src') || '';
    if (!pid) pid = title.toLowerCase().replace(/[^a-z0-9\-]+/g,'-');
    const ex = state.cart.find(x=>x.id===pid);
    if (ex) ex.qty++; else state.cart.push({ id: pid, title, price, img, qty: 1 });
    saveState(); render(); if (action==='buy-now') navigate('cart'); return;
  }

  if (action === 'qty-inc'){ const it=state.cart.find(x=>x.id===id); if (it) it.qty++; saveState(); render(); return; }
  if (action === 'qty-dec'){ const it=state.cart.find(x=>x.id===id); if (it && it.qty>1) it.qty--; saveState(); render(); return; }
  if (action === 'remove'){ state.cart=state.cart.filter(x=>x.id!==id); saveState(); render(); return; }
  if (action === 'checkout'){ alert('결제가 완료되었습니다. (데모)'); state.cart=[]; saveState(); render(); return; }
});

document.addEventListener('submit', async (e)=>{
  const form=e.target;
  if (form.id==='loginForm'){
    e.preventDefault();
    const fd=new FormData(form); const username=(fd.get('username')||'').trim(); const password=fd.get('password')||'';
    const user=state.users.find(u=>u.username===username);
    const passOk=user && (await sha256(password))===user.passHash;
    if (!passOk){ alert('아이디 또는 비밀번호가 올바르지 않습니다.'); return; }
    state.session={ username }; saveState(); navigate('home'); render();
  }
  if (form.id==='signupForm'){
    e.preventDefault();
    const fd=new FormData(form); const username=(fd.get('username')||'').trim(); const password=fd.get('password')||'';
    if (state.users.some(u=>u.username===username)){ alert('이미 존재하는 아이디입니다.'); return; }
    const passHash=await sha256(password);
    state.users.push({ username, passHash }); saveState();
    alert('회원가입이 완료되었습니다. 로그인해 주세요.'); navigate('login'); render();
  }
});

/* ========================================
   가로 스크롤 초기화 (row-scroll 포팅)
======================================== */
function initRowScrolls() {
  document.querySelectorAll('.row-shell').forEach(shell=>{
    const row=shell.querySelector('.row-scroll'); if (!row) return;
    const prevBtn=shell.querySelector('.row-nav2.prev'); const nextBtn=shell.querySelector('.row-nav2.next');

    const isAtStart=()=>{ const first=row.firstElementChild; if(!first) return true; const rr=row.getBoundingClientRect(); const fr=first.getBoundingClientRect(); return fr.left-rr.left>=-4; };
    const isAtEnd=()=>{ const last=row.lastElementChild; if(!last) return true; const rr=row.getBoundingClientRect(); const lr=last.getBoundingClientRect(); return lr.right-rr.right<=4; };
    const updateBtns=()=>{ if(prevBtn) prevBtn.disabled=isAtStart(); if(nextBtn) nextBtn.disabled=isAtEnd(); };
    const scrollBy=(dx)=>{ row.scrollBy({left:dx,behavior:'smooth'}); setTimeout(updateBtns,250); };

    prevBtn?.addEventListener('click',()=>scrollBy(-Math.round(row.clientWidth*0.9)));
    nextBtn?.addEventListener('click',()=>scrollBy(+Math.round(row.clientWidth*0.9)));

    row.addEventListener('wheel',(e)=>{ if(Math.abs(e.deltaX)<Math.abs(e.deltaY)) return; e.preventDefault(); row.scrollLeft+=e.deltaX; updateBtns(); },{passive:false});

    let dragging=false,startX=0,startLeft=0;
    row.addEventListener('mousedown',(e)=>{ dragging=true; startX=e.clientX; startLeft=row.scrollLeft; row.classList.add('dragging'); });
    window.addEventListener('mousemove',(e)=>{ if(!dragging) return; const dx=e.clientX-startX; row.scrollLeft=startLeft-dx; updateBtns(); });
    window.addEventListener('mouseup',()=>{ if(!dragging) return; dragging=false; row.classList.remove('dragging'); });

    updateBtns(); window.addEventListener('resize',updateBtns,{passive:true});
  });
}




