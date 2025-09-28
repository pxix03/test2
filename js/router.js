// #/store, #/cart, #/login ... 경로를 간단 매핑
const routes = {
  '':        'home',
  'store':   'store',
  'cart':    'cart',
  'login':   'login',
  'signup':  'signup',
  'news':    'news',
  'players': 'players',
};
const pick = (h) => routes[h.replace(/^#\/?/, '')] ?? 'home';

export const getRoute = () => pick(location.hash);
export const navigate  = (to) => { location.hash = `#/${to}`; };

export function onRouteChange(handler) {
  window.addEventListener('hashchange', handler);
  document.addEventListener('DOMContentLoaded', handler);
}
