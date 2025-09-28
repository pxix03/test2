import { state, saveState, $app, sha256 } from './js/state.js';
import { getRoute, navigate, onRouteChange } from './js/router.js';
import {
  View_index, View_esports, View_basketball, View_football,
  View_news, View_matches, View_store, View_search,
  View_cart, View_login, View_signup
} from './js/views-full.js';

/* -------------------------------
   파일명 → 라우트 매핑
-------------------------------- */
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

/* -------------------------------
   공통 헤더 렌더/마운트
   - 원래 header.html 스타일과 호환되는 구조
   - 로그인/로그아웃/장바구니 동기화
-------------------------------- */
function mountHeader() {
  const cartCount = state.cart.reduce((s, i) => s + (i.qty || 0), 0);

  const html = `
    <header class="site-header">
      <div class="inner header-top row-compact">
        <a class="logo" data-link="home" aria-label="ENS 홈">ENS<span>Sports</span></a>

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
              <a class="button ghost" data-link="cart">장바구니 (${cartCount})</a>
              <button class="button secondary" data-action="logout">로그아웃</button>
            `
            : `
              <a class="button primary" data-link="login">로그인</a>
              <a class="button ghost" data-link="signup">회원가입</a>
            `
          }
        </div>
      </div>

      <!-- 카테고리 내비 전부 복구 -->
      <nav class="site-nav inner">
        <a data-link="home">전체</a>
        <a data-link="esports">e스포츠</a>
        <a data-link="basketball">농구</a>
        <a data-link="football">축구</a>
        <a data-link="news">뉴스</a>
        <a data-link="matches">경기</a>
        <a data-link="store">스토어</a>
      </nav>
    </header>
  `;

  const mount = document.getElementById('app-header');
  if (mount) mount.outerHTML = html;
  else {
    const exists = document.querySelector('header.site-header');
    if (exists) exists.outerHTML = html;
    else document.body.insertAdjacentHTML('afterbegin', html);
  }
  setActiveNav(); // 현재 탭 강조
}



function setActiveNav() {
  const r = getRoute(); // 'home' | 'store' | ...
  document.querySelectorAll('.site-nav a').forEach(a => {
    const link = a.getAttribute('data-link');
    const isCurrent = (link === r) || (r === 'home' && link === 'store' && location.hash === '');
    a.setAttribute('aria-current', isCurrent ? 'page' : '');
  });
}

/* -------------------------------
   렌더러
-------------------------------- */
function render() {
  const r = getRoute();
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

  // 메인 삽입 (헤더는 mountHeader가 주입)
  $app().innerHTML = body;

  patchLegacyLinks();   // *.html → #/route 변환
  enhanceActions();     // 원본 버튼/링크 → SPA 속성 매핑
  mountHeader();        // 헤더 주입/동기화
  initRowScrolls();     // 가로 스크롤 초기화
}
onRouteChange(render);

/* -------------------------------
   *.html → #/route 자동 변환
-------------------------------- */
function patchLegacyLinks() {
  document.querySelectorAll('a[href$=".html"]').forEach(a => {
    const href = a.getAttribute('href') || '';
    const file = href.split('/').pop().toLowerCase();
    const route = fileToRoute[file];
    if (route) {
      a.setAttribute('href', `#/${route}`);
      a.setAttribute('data-link', route);
    }
  });
  document.querySelectorAll('form[action$=".html"]').forEach(f => {
    const act = f.getAttribute('action') || '';
    const file = act.split('/').pop().toLowerCase();
    const route = fileToRoute[file];
    if (route) {
      f.setAttribute('data-link', route);
      f.removeAttribute('action');
    }
  });
  document.querySelectorAll('[data-nav]').forEach(el => {
    const r = (el.getAttribute('data-nav') || '').trim();
    if (r) el.setAttribute('data-link', r);
  });
}

/* -------------------------------
   원본 버튼/링크 → SPA 표준 속성 부여
-------------------------------- */
function enhanceActions() {
  document.querySelectorAll('a[href$="store.html"], [data-nav="store"]').forEach(el => el.setAttribute('data-link', 'store'));
  document.querySelectorAll('a[href$="cart.html"], [data-nav="cart"]').forEach(el => el.setAttribute('data-link', 'cart'));
  document.querySelectorAll('a[href$="login.html"], [data-nav="login"]').forEach(el => el.setAttribute('data-link', 'login'));
  document.querySelectorAll('a[href$="signup.html"], [data-nav="signup"]').forEach(el => el.setAttribute('data-link', 'signup'));
  document.querySelectorAll('a[href$="index.html"], [data-nav="home"], .logo').forEach(el => el.setAttribute('data-link', 'home'));

  // 장바구니/구매 버튼에 data-action/data-id 자동 할당
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

/* -------------------------------
   전역 클릭/폼 위임
-------------------------------- */
document.addEventListener('click', (e) => {
  const legacyA = e.target.closest('a[href$=".html"]');
  if (legacyA) {
    const href = legacyA.getAttribute('href') || '';
    const file = href.split('/').pop().toLowerCase();
    const route = fileToRoute[file];
    if (route) { e.preventDefault(); navigate(route); return; }
  }

  const link = e.target.closest('[data-link]');
  if (link) { e.preventDefault(); navigate(link.getAttribute('data-link')); return; }

  const el = e.target.closest('[data-action]');
  if (!el) return;
  const action = el.getAttribute('data-action');
  const id = el.getAttribute('data-id');

  if (action === 'logout') { state.session = null; saveState(); render(); return; }

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

/* -------------------------------
   가로 스크롤 초기화 (row-scroll.js 포팅)
   - .row-shell 안에 .row-scroll, 좌/우 버튼(.row-nav2.prev/.next) 가정
-------------------------------- */
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

    // 버튼 클릭
    prevBtn?.addEventListener('click', () => scrollBy(-Math.round(row.clientWidth * 0.9)));
    nextBtn?.addEventListener('click', () => scrollBy(+Math.round(row.clientWidth * 0.9)));

    // 휠 가로 스크롤
    row.addEventListener('wheel', (e) => {
      if (Math.abs(e.deltaX) < Math.abs(e.deltaY)) return; // 수직 우선이면 패스
      e.preventDefault();
      row.scrollLeft += e.deltaX;
      updateBtns();
    }, { passive: false });

    // 드래그 스크롤
    let dragging = false, startX = 0, startLeft = 0;
    row.addEventListener('mousedown', (e) => {
      dragging = true; startX = e.clientX; startLeft = row.scrollLeft;
      row.classList.add('dragging');
    });
    window.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      row.scrollLeft = startLeft - dx;
      updateBtns();
    });
    window.addEventListener('mouseup', () => {
      if (!dragging) return;
      dragging = false; row.classList.remove('dragging');
    });

    // 초기 상태
    updateBtns();
    // 리사이즈 시 재계산
    window.addEventListener('resize', updateBtns, { passive: true });
  });
}




