
import { state, saveState, $app, sha256 } from './js/state.js';
import { getRoute, navigate, onRouteChange } from './js/router.js';
import {
  View_index, View_esports, View_basketball, View_football,
  View_news, View_matches, View_store, View_search,
  View_cart, View_login, View_signup
} from './js/views-full.js';

function Header() {
  const cartCount = state.cart.reduce((s, i) => s + (i.qty||0), 0);
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
  enhanceActions(); // map legacy buttons to SPA actions
}
onRouteChange(render);

// Map legacy DOM (from original pages) to SPA actions
function enhanceActions() {
  // Add data-link to nav anchors/buttons that look like page links
  document.querySelectorAll('a[href$="store.html"], [data-nav="store"]').forEach(el=>el.setAttribute('data-link','store'));
  document.querySelectorAll('a[href$="cart.html"], [data-nav="cart"]').forEach(el=>el.setAttribute('data-link','cart'));
  document.querySelectorAll('a[href$="login.html"], [data-nav="login"]').forEach(el=>el.setAttribute('data-link','login'));
  document.querySelectorAll('a[href$="signup.html"], [data-nav="signup"]').forEach(el=>el.setAttribute('data-link','signup'));
  document.querySelectorAll('a[href$="index.html"], [data-nav="home"], .logo').forEach(el=>el.setAttribute('data-link','home'));

  // Add data-action for cart buttons commonly used in original markup
  document.querySelectorAll('[data-add-to-cart], .add-to-cart, button.add-cart, button[data-role="add-cart"]').forEach(btn=>{
    const card = btn.closest('[data-id]') || btn.closest('[data-product-id]');
    const pid = (card?.getAttribute('data-id') || card?.getAttribute('data-product-id') || '').trim();
    if (pid) {
      btn.setAttribute('data-action','add-to-cart');
      btn.setAttribute('data-id', pid);
    }
  });
  document.querySelectorAll('[data-buy-now], .buy-now, button.buy-now').forEach(btn=>{
    const card = btn.closest('[data-id]') || btn.closest('[data-product-id]');
    const pid = (card?.getAttribute('data-id') || card?.getAttribute('data-product-id') || '').trim();
    if (pid) {
      btn.setAttribute('data-action','buy-now');
      btn.setAttribute('data-id', pid);
    }
  });

  // Fallback: match buttons with text '장바구니'/'바로구매'
  Array.from(document.querySelectorAll('button')).forEach(btn=>{
    const t = btn.textContent?.trim();
    if (!btn.hasAttribute('data-action') && /장바구니/.test(t||'')) {
      const card = btn.closest('[data-id], [data-product-id]');
      const pid = (card?.getAttribute('data-id') || card?.getAttribute('data-product-id') || '').trim();
      if (pid) { btn.setAttribute('data-action','add-to-cart'); btn.setAttribute('data-id', pid); }
    }
    if (!btn.hasAttribute('data-action') && /바로구매|구매/.test(t||'')) {
      const card = btn.closest('[data-id], [data-product-id]');
      const pid = (card?.getAttribute('data-id') || card?.getAttribute('data-product-id') || '').trim();
      if (pid) { btn.setAttribute('data-action','buy-now'); btn.setAttribute('data-id', pid); }
    }
  });
}

// Global click delegation
document.addEventListener('click', (e) => {
  const link = e.target.closest('[data-link]');
  if (link) { navigate(link.getAttribute('data-link')); return; }

  const el = e.target.closest('[data-action]');
  if (!el) return;
  const action = el.getAttribute('data-action');
  const id = el.getAttribute('data-id');

  if (action === 'logout') {
    state.session = null; saveState(); render(); return;
  }

  if (action === 'add-to-cart' || action === 'buy-now') {
    if (!state.session) { alert('로그인 후 이용 가능합니다.'); navigate('login'); return; }
    // Attempt to derive product info from DOM or fallback to defaults
    let title = el.getAttribute('data-title') || (el.closest('[data-title]')?.getAttribute('data-title')) || '';
    let price = parseInt(el.getAttribute('data-price') || (el.closest('[data-price]')?.getAttribute('data-price')) || '0',10) || 0;
    let img = (el.closest('article, .card, .product, [data-img]')?.querySelector('img')?.getAttribute('src')) || '';
    const pid = id || title.toLowerCase().replace(/[^a-z0-9\-]+/g,'-');
    if (!title) {
      const card = el.closest('article, .card, .product, [data-title]');
      title = card?.querySelector('h3,h4,.title')?.textContent?.trim() || '상품';
    }
    if (!price) {
      const t = el.closest('article, .card')?.querySelector('.price')?.textContent || '';
      const m = t.replace(/[^0-9]/g,''); price = m ? parseInt(m,10) : 0;
    }
    if (!img) img = el.closest('article, .card')?.querySelector('img')?.src || '';
    // Merge into cart
    const ex = state.cart.find(x => x.id === pid);
    if (ex) ex.qty++; else state.cart.push({ id: pid, title, price, img, qty: 1 });
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

// Form delegation
document.addEventListener('submit', async (e) => {
  const form = e.target;
  if (form.id === 'loginForm') {
    e.preventDefault();
    const fd = new FormData(form);
    const username = (fd.get('username')||'').trim();
    const password = fd.get('password')||'';
    const user = state.users.find(u => u.username === username);
    const passOk = user && (await sha256(password)) === user.passHash;
    if (!passOk) { alert('아이디 또는 비밀번호가 올바르지 않습니다.'); return; }
    state.session = { username };
    saveState(); navigate('home'); render();
  }
  if (form.id === 'signupForm') {
    e.preventDefault();
    const fd = new FormData(form);
    const username = (fd.get('username')||'').trim();
    const password = fd.get('password')||'';
    if (state.users.some(u => u.username === username)) { alert('이미 존재하는 아이디입니다.'); return; }
    const passHash = await sha256(password);
    state.users.push({ username, passHash });
    saveState(); alert('회원가입이 완료되었습니다. 로그인해 주세요.');
    navigate('login'); render();
  }
});
