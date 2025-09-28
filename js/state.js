const KEY_USER = 'ensUser'; // { username }
const KEY_CART = 'ensCart'; // [{id,title,price,qty,img}]

export const LS = {
  get(k, fb) { try { return JSON.parse(localStorage.getItem(k)) ?? fb; } catch { return fb; } },
  set(k, v) { localStorage.setItem(k, JSON.stringify(v)); }
};

export const state = {
  session: (() => {
    const u = LS.get(KEY_USER, null);
    return u ? { username: u.username } : null;
  })(),
  cart: LS.get(KEY_CART, []),
  users: LS.get('ensUsers', []),
};

export function saveState() {
  if (state.session) localStorage.setItem(KEY_USER, JSON.stringify({ username: state.session.username }));
  else localStorage.removeItem(KEY_USER);
  LS.set(KEY_CART, state.cart);
  LS.set('ensUsers', state.users);
}

export const $app = () => document.getElementById('app');
export const fmt = n => Number(n).toLocaleString('ko-KR');

export async function sha256(text) {
  try {
    if (crypto?.subtle) {
      const enc = new TextEncoder().encode(text);
      const buf = await crypto.subtle.digest('SHA-256', enc);
      return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2,'0')).join('');
    }
  } catch (_) {}
  // 데모 폴백(보안성 낮음)
  let h = 0;
  for (let i = 0; i < text.length; i++) { h = (h << 5) - h + text.charCodeAt(i); h |= 0; }
  return ('00000000' + (h >>> 0).toString(16)).slice(-8);
}
