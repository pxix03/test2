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
   공통 헤더(간단 버전)
-------------------------------- */
function Header() {
  const cartCount = state.cart.reduce((s, i) => s + (i.qty || 0), 0);
  return `
    <header class="header">
      <div id="app-header"></div>
      <div class="inner header-top">
        <a class="logo" data-link="home" aria-label="ENS 홈">ENS</a>
        <div class="header-actions">
          ${state.session
            ? `<span class="hello">안녕하세요, <b>${state.session.username}</b>님</span>
               <button class="btn ghost" data-link="cart">장바구니 (${cartCount})</button>
               <button class="btn outline" data-action="logout">로그아웃</button>`
            : `<button class="btn" data-link="login">로그인</button>
               <button class="btn ghost" data-link="signup">회원가입</button>`
          }
        </div>
      </div>
    </header>`;
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
  $app().innerHTML = Header() + body;

  // ▼▼ 수정 추가: 남은 *.html 링크를 전부 #/route로 교체
  patchLegacyLinks();
  // 기존 마크업(class/속성) 그대로여도 SPA 동작하도록 버튼/링크 표준화
  enhanceActions();
}
onRouteChange(render);

/* -------------------------------
   *.html → #/route 자동 변환
-------------------------------- */
function patchLegacyLinks() {
  // <a href="*.html"> → #/route
  document.querySelectorAll('a[href$=".html"]').forEach(a => {
    const href = a.getAttribute('href') || '';
    const file = href.split('/').pop().toLowerCase();
    const route = fileToRoute[file];
    if (route) {
      a.setAttribute('href', `#/${route}`);
      a.setAttribute('data-link', route);
    }
  });

  // <form action="*.html"> → SPA에서 기본 제출 차단(라우트 이동만)
  document.querySelectorAll('form[action$=".html"]').forEach(f => {
    const act = f.getAttribute('action') || '';
    const file = act.split('/').pop().toLowerCase();
    const route = fileToRoute[file];
    if (route) {
      f.setAttribute('data-link', route);
      f.removeAttribute('action');
    }
  });

  // data-nav="store" 같은 커스텀 네비도 data-link로 매핑
  document.querySelectorAll('[data-nav]').forEach(el => {
    const r = (el.getAttribute('data-nav') || '').trim();
    if (r) el.setAttribute('data-link', r);
  });
}

/* -------------------------------
   원본 버튼/링크 → SPA 표준 속성 부여
-------------------------------- */
function enhanceActions() {
  // nav 유사 요소들에 data-link 부여
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

  // 버튼 텍스트로도 보완 매칭
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
   전역 이벤트 위임
-------------------------------- */
document.addEventListener('click', (e) => {
  // 1) *.html로 가는 레거시 <a> 클릭 차단 후 SPA 라우팅
  const legacyA = e.target.closest('a[href$=".html"]');
  if (legacyA) {
    const href = legacyA.getAttribute('href') || '';
    const file = href.split('/').pop().toLowerCase();
    const route = fileToRoute[file];
    if (route) {
      e.preventDefault();
      navigate(route);
      return;
    }
  }

  // 2) data-link 기반 라우팅
  const link = e.target.closest('[data-link]');
  if (link) {
    e.preventDefault();
    navigate(link.getAttribute('data-link'));
    return;
  }

  // 3) data-action 처리
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const action = el.getAttribute('data-action');
  const id = el.getAttribute('data-id');

  if (action === 'logout') {
    state.session = null; saveState(); render(); return;
  }

  if (action === 'add-to-cart' || action === 'buy-now') {
    if (!state.session) { alert('로그인 후 이용 가능합니다.'); navigate('login'); return; }

    // DOM에서 상품 정보 추출 (id/제목/가격/이미지)
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
    if (ex) ex.qty++;
    else state.cart.push({ id: pid, title, price, img, qty: 1 });

    saveState(); render();
    if (action === 'buy-now') navigate('cart');
    return;
  }

  if (action === 'qty-inc') {
    const it = state.cart.find(x => x.id === id);
    if (it) it.qty++;
    saveState(); render(); return;
  }
  if (action === 'qty-dec') {
    const it = state.cart.find(x => x.id === id);
    if (it && it.qty > 1) it.qty--;
    saveState(); render(); return;
  }
  if (action === 'remove') {
    state.cart = state.cart.filter(x => x.id !== id);
    saveState(); render(); return;
  }
  if (action === 'checkout') {
    alert('결제가 완료되었습니다. (데모)');
    state.cart = []; saveState(); render(); return;
  }
});

/* -------------------------------
   폼 위임 (로그인/회원가입)
-------------------------------- */
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
    state.session = { username };
    saveState(); navigate('home'); render();
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
