const routes = {
  '':           'home',
  'home':       'home',
  'esports':    'esports',
  'basketball': 'basketball',
  'football':   'football',
  'news':       'news',
  'matches':    'matches',
  'store':      'store',
  'search':     'search',
  'cart':       'cart',
  'login':      'login',
  'signup':     'signup',
};

const pick = (h) => routes[h.replace(/^#\/?/, '')] ?? 'home';

export const getRoute = () => pick(location.hash);
export const navigate  = (to) => { location.hash = `#/${to}`; };

export function onRouteChange(handler) {
  window.addEventListener('hashchange', handler);
  document.addEventListener('DOMContentLoaded', handler);
}
