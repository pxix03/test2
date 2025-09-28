// 기존 로컬스토리지 키 호환 (auth.js / cart.js와 동일 키)
const KEY_USER = 'ensUser'; // { username }
const KEY_CART = 'ensCart'; // [{id,title,price,qty,img}]

// 공용 저장소 헬퍼
export const LS = {
  get(k, fb) { try { return JSON.parse(localStorage.getItem(k)) ?? fb; } catch { return fb; } },
  set(k, v) { localStorage.setItem(k, JSON.stringify(v)); }
};

export const state = {
  // 세션은 ensUser와 동기화 (username만 사용)
  session: (() => {
    const u = LS.get(KEY_USER, null);
    return u ? { username: u.username } : null;
  })(),
  cart: LS.get(KEY_CART, []),
  users: LS.get('ensUsers', []), // 프론트 전용 가입자 DB (과제용)
};

export function saveState() {
  // ensUser 동기화
  if (state.session) localStorage.setItem(KEY_USER, JSON.stringify({ username: state.session.username }));
  else localStorage.removeItem(KEY_USER);

  // ensCart 동기화
  LS.set(KEY_CART, state.cart);

  // 프론트 전용 가입자 DB
  LS.set('ensUsers', state.users);
}

export const $app = () => document.getElementById('app');
export const fmt = n => Number(n).toLocaleString('ko-KR');

// 브라우저 SubtleCrypto 기반 SHA-256
export async function sha256(text) {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2,'0')).join('');
}
