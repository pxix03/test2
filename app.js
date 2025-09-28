import { state, saveState, $app, sha256 } from './js/state.js';
import { DATA } from './js/data.js';
import { getRoute, navigate, onRouteChange } from './js/router.js';
import {
  Header, ViewHome, ViewStore, ViewCart,
  ViewLogin, ViewSignup, ViewNews, ViewPlayers
} from './js/views.js';

// 라우트 → 뷰 매핑 + 렌더
function render() {
  const r = getRoute();
  const body =
    r === 'home'    ? ViewHome()   :
    r === 'store'   ? ViewStore()  :
    r === 'cart'    ? ViewCart()   :
    r === 'login'   ? ViewLogin()  :
    r === 'signup'  ? ViewSignup() :
    r === 'news'    ? ViewNews()   :
    r === 'players' ? ViewPlayers(): ViewHome();

  $app().innerHTML = Header() + `<main class="main">${body}</main>`;
}
onRouteChange(render);

// 클릭 위임
document.addEventListener('click', (e) => {
  const link = e.target.closest('[data-link]');
  if (link) { navigate(link.getAttribute('data-link')); return; }

  const el = e.target.closest('[data-action]');
  if (!el) return;
  const action = el.getAttribute('data-action');
  const id = el.getAttribute('data-id');

  // 공통: 로그아웃
  if (action === 'logout') {
    state.session = null;
    saveState(); render(); return;
  }

  // 홈/스토어: 장바구니/바로구매 (비로그인 게이트)
  if (action === 'add-to-cart' || action === 'buy-now') {
    if (!state.session) { alert('로그인 후 이용 가능합니다.'); navigate('login'); return; }
    const p = DATA.products.find(x => x.id === id);
    if (!p) return;
    const ex = state.cart.find(x => x.id === p.id);
    if (ex) ex.qty++; else state.cart.push({ ...p, qty: 1 });
    saveState(); render();
    if (action === 'buy-now') navigate('cart');
    return;
  }

  // 장바구니 내부: 수량/삭제/결제
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
    state.cart = [];
    saveState(); render(); return;
  }
});

// 폼 위임 (로그인/회원가입)
document.addEventListener('submit', async (e) => {
  const form = e.target;
  if (form.id === 'loginForm') {
    e.preventDefault();
    const fd = new FormData(form);
    const username = fd.get('username').trim();
    const password = fd.get('password');

    // 가입자 검증
    const user = state.users.find(u => u.username === username);
    const passOk = user && (await sha256(password)) === user.passHash;
    if (!passOk) { alert('아이디 또는 비밀번호가 올바르지 않습니다.'); return; }

    state.session = { username };
    saveState(); navigate('home'); render();
  }

  if (form.id === 'signupForm') {
    e.preventDefault();
    const fd = new FormData(form);
    const username = fd.get('username').trim();
    const password = fd.get('password');

    if (state.users.some(u => u.username === username)) {
      alert('이미 존재하는 아이디입니다.'); return;
    }
    const passHash = await sha256(password);
    state.users.push({ username, passHash });
    saveState();
    alert('회원가입이 완료되었습니다. 로그인해 주세요.');
    navigate('login'); render();
  }
});
