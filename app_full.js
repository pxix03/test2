import { state, saveState, $app, sha256 } from './js/state.js';
import { getRoute, navigate, onRouteChange } from './js/router.js';
import {
  View_index, View_esports, View_basketball, View_football,
  View_news, View_matches, View_store, View_search,
  View_cart, View_login, View_signup
} from './js/views-full.js';

/* ========================================
   파일명 → 라우트 매핑 (레거시 a[href="*.html"]용)
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
   홈 카드 자동 라우팅 유틸
======================================== */
const KWD_TO_ROUTE = [
  { kws: ['e스포츠', 'esports', 'e-sports', 'e sport'], route: 'esports' },
  { kws: ['농구', 'basketball', 'nba'],                route: 'basketball' },
  { kws: ['축구', 'football', 'soccer', 'epl'],        route: 'football' },
  { kws: ['뉴스', 'news'],                              route: 'news' },
  { kws: ['경기', '일정', 'matches', 'schedule'],       route: 'matches' },
  { kws: ['스토어', 'store', '쇼핑', 'shop'],           route: 'store' },
];
function textOf(el) {
  return (el?.textContent || el?.getAttribute?.('aria-label') || '').trim().toLowerCase();
}
function guessRouteFromText(s='') {
  const t = s.toLowerCase();
  for (const {kws, route} of KWD_TO_ROUTE) {
    if (kws.some(k => t.includes(k))) return route;
  }
  return null;
}
function mapHomeCardToRoute(card) {
  // 명시적 표기 우선
  const explicit = card.getAttribute('data-link') || card.getAttribute('data-category');
  if (explicit && explicit !== 'home') return explicit;

  // 카드 내부 텍스트/섹션 제목/이미지 ALT 에서 유추
  const titleEl = card.querySelector('h1,h2,h3,h4,.title,.card-title');
  const sectionTitle = card.closest('section, .section, .row-shell')?.querySelector('h2,h3,.section-title');
  const imgAlt = card.querySelector('img')?.getAttribute('alt') || '';

  return (
    guessRouteFromText(textOf(card)) ||
    guessRouteFromText(textOf(titleEl)) ||
    guessRouteFromText(textOf(sectionTitle)) ||
    guessRouteFromText(imgAlt) ||
    null
  );
}

/* ========================================
   헤더 렌더 (styles.css 호환 클래스)
   - 장바구니는 로그인 영역(auth-controls)에만 표시
   - 카테고리 내비 전부
   - 항상 body 맨 앞에 주입(레이아웃 간섭 방지)
======================================== */
function mountHeader() {
  const cartCount = state.cart.reduce((s, i) => s + (i.qty || 0), 0);

  const html = `
    <header class="site-header">
      <div class="inner header-top row-compact">
        <a class="logo" href="#/home" data-link="home" aria-label="ENS 홈">ENS<span>Sports</span></a>

        <form class="site-search" id="siteSearchForm" onsubmit="return false">
          <input type="search" name="q" id="siteSearchInput"
                 placeholder="검색 (선수, 뉴스, 팀, 상품…)" autocomplete="off" />
          <button type="button" class="button primary" data-link="search">검색</button>
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

      <nav class="site-nav inner">
        <a href="#/home"       data-link="home">전체</a>
        <a href="#/esports"    data-link="esports">e스포츠</a>
        <a href="#/basketball" data-link="basketball">농구</a>
        <a href="#/football"   data-link="football">축구</a>
        <a href="#/news"       data-link="news">뉴스</a>
        <a href="#/matches"    data-link="matches">경기</a>
        <a href="#/store"      data-link="store">스토어</a>
      </nav>
    </header>
  `;

  const old = document.querySelector('header.site-header');
  if (old) old.remove();
  document.body.insertAdjacentHTML('afterbegin', html);
  setActiveNav();
}
function setActiveNav() {
  const r = getRoute();
  document.querySelectorAll('.site-nav a').forEach(a => {
    const link = a.getAttribute('data-link');
    a.setAttribute('aria-current', link === r ? 'page' : '');
  });
}

/* ========================================
   렌더러 + cart 라우트 가드
======================================== */
function render() {
  const r = getRoute();

  // 장바구니: 비로그인 접근 차단
  if (r === 'cart' && !state.session) {
    alert('장바구니는 로그인 후 이용 가능합니다.');
    navigate('login');
    return;
  }

  let body = '';
  switch (r) {
    case 'home':       body = View_index(); break;
    case 'esports':    body = View_esports?.() || View_index(); break;
    case 'basketball': body = View_basketball?.() || View_index(); break;
    case 'football':   body = View_football?.() || View_index(); break;
    case 'news':       body = View_news?.() || View_index(); break;
    case 'matches':    body = View_matches?.() || View_index(); break;
    case 'store':      body = View_store?.() || View_index(); break;
    case 'search':     body = View_search?.() || View_index(); break;
    case 'cart':       body = View_cart?.() || View_index(); break;
    case 'login':      body = View_login?.() || View_index(); break;
    case 'signup':     body = View_signup?.() || View_index(); break;
    default:           body = View_index(); break;
  }

  $app().innerHTML = body;

  patchLegacyLinks();    // *.html → #/route 변환
  enhanceActions();      // 원본 버튼/링크 → SPA 속성 매핑
  mountHeader();         // 헤더 주입/동기화
  initRowScrolls();      // 가로 스크롤 초기화

  // 홈 카드에 카테고리 라우트 자동 태깅
  if (getRoute() === 'home') {
    document.querySelectorAll(
      '.card, .product-card, article.product, .category-card, .player-card, .news-card, .match-card'
    ).forEach(card => {
      const route = mapHomeCardToRoute(card);
      if (route) card.setAttribute('data-link', route);
    });
  }
}
onRouteChange(render);

/* ========================================
   *.html → #/route 자동 변환
======================================== */
function patchLegacyLinks() {
  // a[href="*.html"]
  document.querySelectorAll('a[href$=".html"]').forEach(a => {
    const href = a.getAttribute('href') || '';
    const file = href.split('/').pop().toLowerCase();
    const route = fileToRoute[file];
    if (route) {
      a.setAttribute('href', `#/${route}`);
      a.setAttribute('data-link', route);
    }
  });

  // form[action="*.html"]
  document.querySelectorAll('form[action$=".html"]').forEach(f => {
    const act = f.getAttribute('action') || '';
    const file = act.split('/').pop().toLowerCase();
    const route = fileToRoute[file];
    if (route) {
      f.setAttribute('data-link', route);
      f.removeAttribute('action');
    }
  });

  // data-nav → data-link
  document.querySelectorAll('[data-nav]').forEach(el => {
    const r = (el.getAttribute('data-nav') || '').trim();
    if (r) el.setAttribute('data-link', r);
  });

  // site-nav 내부 보강
  document.querySelectorAll('.site-nav a[href$=".html"]').forEach(a => {
    const href = a.getAttribute('href') || '';
    const file = href.split('/').pop().toLowerCase();
    const route = fileToRoute[file];
    if (route) a.setAttribute('data-link', route);
  });
}

/* ========================================
   원본 버튼/링크 → SPA 표준 속성 부여
======================================== */
function enhanceActions() {
  // 내비 유사 요소
  document.querySelectorAll('a[href$="store.html"], [data-nav="store"]').forEach(el => el.setAttribute('data-link', 'store'));
  document.querySelectorAll('a[href$="cart.html"], [data-nav="cart"]').forEach(el => el.setAttribute('data-link', 'cart'));
  document.querySelectorAll('a[href$="login.html"], [data-nav="login"]').forEach(el => el.setAttribute('data-link', 'login'));
  document.querySelectorAll('a[href$="signup.html"], [data-nav="signup"]').forEach(el => el.setAttribute('data-link', 'signup'));
  document.querySelectorAll('a[href$="index.html"], [data-nav="home"], .logo').forEach(el => el.setAttribute('data-link', 'home'));

  // 장바구니/구매 버튼
  document.querySelectorAll('[data-add-to-cart], .add-to-cart, button.add-cart, button[data-role="add-cart"]').forEach(btn => {
    const card = btn.closest('[data-id]') || btn.closest('[data-product-id]');
    const pid = (card?.getAttribute('data-id') || card?.getAttribute('data-product-id') || '').trim();
    if (pid) {
      btn.setAttribute('data-action', 'add-to-cart');
      btn.setAttribute('data-id', pid);
    }
  });
  document.querySelectorAll('[data-buy-now], .buy-now, button.buy-now').forEach(btn => {
    const card = btn.closest('[data-id]') || btn.closest('[data-product-id]');
    const pid = (card?.getAttribute('data-id') || card?.getAttribute('data-product-id') || '').trim();
    if (pid) {
      btn.setAttribute('data-action', 'buy-now');
      btn.setAttribute('data-id', pid);
    }
  });

  // 버튼 텍스트 보정
  Array.from(document.querySelectorAll('button')).forEach(btn => {
    const t = (btn.textContent || '').trim();
    if (!btn.hasAttribute('data-action') && /장바구니/.test(t)) {
      const card = btn.closest('[data-id], [data-product-id]');
      const pid = (card?.getAttribute('data-id') || card?.getAttribute('data-product-id') || '').trim();
      if (pid) { btn.setAttribute('data-action', 'add-to-cart'); btn.setAttribute('data-id', pid); }
    }
    if (!btn.hasAttribute('data-action') && /바로구매|구매/.test(t)) {
      const card = btn.closest('[data-id], [data-product-id]');
      const pid = (card?.getAttribute('data-id') || card?.getAttribute('data-product-id') || '').trim();
      if (pid) { btn.setAttribute('data-action', 'buy-now'); btn.setAttribute('data-id', pid); }
    }
  });
}

/* ========================================
   도우미: 인터랙티브 요소 체크
======================================== */
function isInteractive(el) {
  return !!el.closest('a, button, input, select, textarea, label, [contenteditable], [role="button"], [role="link"]');
}

/* ========================================
   전역 클릭/폼 위임
======================================== */
document.addEventListener('click', (e) => {
  // 1) 레거시 a[href="*.html"] → SPA 라우팅
  const legacyA = e.target.closest('a[href$=".html"]');
  if (legacyA) {
    const href = legacyA.getAttribute('href') || '';
    const file = href.split('/').pop().toLowerCase();
    const route = fileToRoute[file];
    if (route) { e.preventDefault(); navigate(route); return; }
  }

  // 2) data-link 라우팅
  const link = e.target.closest('[data-link]');
  if (link) {
    e.preventDefault();
    const to = link.getAttribute('data-link');
    if (to === 'cart' && !state.session) { alert('장바구니는 로그인 후 이용 가능합니다.'); navigate('login'); return; }
    navigate(to);
    return;
  }

  // 3) 카드 전체 클릭: 홈이면 카테고리로, 아니면 카드 내부 첫 링크로
  const card = e.target.closest(
    '.card, .product-card, article.product, .category-card, .player-card, .news-card, .match-card'
  );
  if (card && !isInteractive(e.target)) {
    e.preventDefault();
    let to = card.getAttribute('data-link');

    if (getRoute() === 'home' && (!to || to === 'home')) {
      to = mapHomeCardToRoute(card);
    }

    if (!to) {
      const firstLinkEl =
        card.querySelector('[data-link]') ||
        card.querySelector('a[href^="#/"]') ||
        card.querySelector('a[href$=".html"]');

      if (firstLinkEl) {
        const href = firstLinkEl.getAttribute('href') || '';
        if (href.endsWith('.html')) {
          const file = href.split('/').pop().toLowerCase();
          const route = fileToRoute[file];
          if (route) { navigate(route); return; }
        }
        to = firstLinkEl.getAttribute('data-link') || href.replace(/^#\//,'');
      }
    }

    if (to) { navigate(to); return; }
  }

  // 4) 장바구니/구매/로그아웃
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const action = el.getAttribute('data-action');
  const id = el.getAttribute('data-id');

  if (action === 'logout') {
    state.session = null; saveState(); render(); return;
  }

  if (action === 'add-to-cart' || action === 'buy-now') {
    if (!state.session) { alert('로그인 후 이용 가능합니다.'); navigate('login'); return; }

    const container = el.closest('[data-id], [data-title], [data-price], article, .card, .product');
    let pid   = id || container?.getAttribute('data-id') || '';
    let title = el.getAttribute('data-title') || container?.getAttribute('data-title') ||
                container?.querySelector('h3,h4,.title')?.textContent?.trim() || '상품';
    let price = parseInt(
      el.getAttribute('data-price') ||
      container?.getAttribute('data-price') ||
      (container?.querySelector('.price')?.textContent || '').replace(/[^0-9]/g, '') ||
      '0', 10
    ) || 0;
    let img   = container?.getAttribute('data-img') ||
                container?.querySelector('img')?.getAttribute('src') || '';

    if (!pid) pid = title.toLowerCase().replace(/[^a-z0-9\-]+/g, '-');

    const ex = state.cart.find(x => x.id === pid);
    if (ex) ex.qty++; else state.cart.push({ id: pid, title, price, img, qty: 1 });

    saveState(); render();
    if (action === 'buy-now') navigate('cart');
    return;
  }

  if (action === 'qty-inc') { const it = state.cart.find(x => x.id === id); if (it) it.qty++; saveState(); render(); return; }
  if (action === 'qty-dec') { const it = state.cart.find(x => x.id === id); if (it && it.qty > 1) it.qty--; saveState(); render(); return; }
  if (action === 'remove')  { state.cart = state.cart.filter(x => x.id !== id); saveState(); render(); return; }
  if (action === 'checkout'){ alert('결제가 완료되었습니다. (데모)'); state.cart = []; saveState(); render(); return; }
});

document.addEventListener('submit', async (e) => {
  const form = e.target;
  if (form.id === 'loginForm') {
    e.preventDefault();
    const fd = new FormData(form);
    const username = (fd.get('username') || '').trim();
    const password = fd.get('password') || '';
    const user = state.users.find(u => u.username === username);
    const passOk = user && (await sha256(password)) === user.passHash;
    if (!passOk) { alert('아이디 또는 비밀번호가 올바르지 않습니다.'); return; }
    state.session = { username }; saveState(); navigate('home'); render();
  }
  if (form.id === 'signupForm') {
    e.preventDefault();
    const fd = new FormData(form);
    const username = (fd.get('username') || '').trim();
    const password = fd.get('password') || '';
    if (state.users.some(u => u.username === username)) { alert('이미 존재하는 아이디입니다.'); return; }
    const passHash = await sha256(password);
    state.users.push({ username, passHash });
    saveState(); alert('회원가입이 완료되었습니다. 로그인해 주세요.');
    navigate('login'); render();
  }
});

/* ========================================
   가로 스크롤 초기화 (row-scroll.js 포팅)
   .row-shell > .row-scroll, 좌/우 버튼 .row-nav2.prev/.next
======================================== */
function initRowScrolls() {
  document.querySelectorAll('.row-shell').forEach(shell => {
    const row = shell.querySelector('.row-scroll');
    if (!row) return;
    const prevBtn = shell.querySelector('.row-nav2.prev');
    const nextBtn = shell.querySelector('.row-nav2.next');

    const isAtStart = () => {
      const first = row.firstElementChild;
      if (!first) return true;
      const rr = row.getBoundingClientRect();
      const fr = first.getBoundingClientRect();
      return fr.left - rr.left >= -4;
    };
    const isAtEnd = () => {
      const last = row.lastElementChild;
      if (!last) return true;
      const rr = row.getBoundingClientRect();
      const lr = last.getBoundingClientRect();
      return lr.right - rr.right <= 4;
    };
    const updateBtns = () => {
      if (prevBtn) prevBtn.disabled = isAtStart();
      if (nextBtn) nextBtn.disabled = isAtEnd();
    };
    const scrollBy = (dx) => {
      row.scrollBy({ left: dx, behavior: 'smooth' });
      setTimeout(updateBtns, 250);
    };

    prevBtn?.addEventListener('click', () => scrollBy(-Math.round(row.clientWidth * 0.9)));
    nextBtn?.addEventListener('click', () => scrollBy(+Math.round(row.clientWidth * 0.9)));

    row.addEventListener('wheel', (e) => {
      if (Math.abs(e.deltaX) < Math.abs(e.deltaY)) return;
      e.preventDefault();
      row.scrollLeft += e.deltaX;
      updateBtns();
    }, { passive: false });

    let dragging = false, startX = 0, startLeft = 0;
    row.addEventListener('mousedown', (e) => { dragging = true; startX = e.clientX; startLeft = row.scrollLeft; row.classList.add('dragging'); });
    window.addEventListener('mousemove', (e) => { if (!dragging) return; const dx = e.clientX - startX; row.scrollLeft = startLeft - dx; updateBtns(); });
    window.addEventListener('mouseup', () => { if (!dragging) return; dragging = false; row.classList.remove('dragging'); });

    updateBtns();
    window.addEventListener('resize', updateBtns, { passive: true });
  });
}
