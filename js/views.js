import { state, fmt } from './state.js';
import { DATA } from './data.js';

/* ===== Header ===== */
export function Header() {
  const cartCount = state.cart.reduce((s, i) => s + i.qty, 0);
  return `
    <header class="site-header">
      <div class="inner header-top row-compact">
        <a class="logo" data-link="home" aria-label="ENS 홈">ENS<span>Sports</span></a>

        <form class="site-search" id="siteSearchForm" onsubmit="return false">
          <input type="search" name="q" id="siteSearchInput"
                 placeholder="검색 (선수, 뉴스, 팀, 상품…)" autocomplete="off" />
          <button type="button" class="button primary" data-link="news">검색</button>
        </form>

        <div class="header-actions">
          ${state.session
            ? `<span class="hello">안녕하세요, <b>${state.session.username}</b>님</span>
               <button class="button ghost" data-link="cart">장바구니 (${cartCount})</button>
               <button class="button secondary" data-action="logout">로그아웃</button>`
            : `<button class="button primary" data-link="login">로그인</button>
               <button class="button ghost" data-link="signup">회원가입</button>`
          }
        </div>
      </div>

      <nav class="nav-compact inner">
        <button class="nav-btn" data-link="store">스토어</button>
        <button class="nav-btn" data-link="news">뉴스</button>
        <button class="nav-btn" data-link="players">선수</button>
        <button class="nav-btn" data-link="cart">장바구니</button>
      </nav>
    </header>
  `;
}

/* ===== Home ===== */
export function ViewHome() {
  return `
    <section class="hero" aria-labelledby="hero-title">
      <div class="inner">
        <div class="hero-text">
          <h1 id="hero-title">ENS</h1>
          <p>e스포츠부터 NBA, EPL까지 스타 선수 정보와 최신 뉴스, 굿즈 쇼핑.</p>
          <div class="cta">
            <button class="button primary lg" data-link="store">스토어 보기</button>
            <button class="button ghost lg" data-link="players">선수 보기</button>
          </div>
        </div>
        <div class="hero-art" aria-hidden="true"></div>
      </div>
    </section>

    <section class="section">
      <div class="inner">
        <h2 class="section-title">추천 상품</h2>
        <div class="grid products">
          ${DATA.products.map(CardProduct).join('')}
        </div>
      </div>
    </section>
  `;
}

/* ===== Store ===== */
export function ViewStore() {
  return `
    <section class="section store">
      <div class="inner">
        <div class="section-head">
          <h2>ENS 스토어</h2>
          <p>둘러보기는 자유! 로그인하면 장바구니 담기가 가능합니다.</p>
        </div>
        <div class="grid products">
          ${DATA.products.map(CardProduct).join('')}
        </div>
      </div>
    </section>
  `;
}

/* ===== Cart ===== */
export function ViewCart() {
  if (!state.session) return Gate('장바구니는 로그인 후 이용 가능합니다.', 'login');

  const items = state.cart;
  const total = items.reduce((s, i) => s + i.price * i.qty, 0);

  return `
    <section class="section cart">
      <div class="inner">
        <h2>장바구니</h2>
        ${items.length === 0
          ? `<p class="muted">장바구니가 비어 있어요.</p>`
          : `
            <div class="cart-list">
              ${items.map(CartRow).join('')}
            </div>
            <div class="cart-total">
              합계: <b>${fmt(total)}원</b>
              <button class="button primary lg" data-action="checkout">결제하기</button>
            </div>
          `}
      </div>
    </section>
  `;
}

/* ===== Auth ===== */
export function ViewLogin() {
  if (state.session) return Already('이미 로그인되어 있습니다.', 'home');
  return `
    <section class="section auth">
      <div class="inner small">
        <h2>로그인</h2>
        <form id="loginForm" class="form" autocomplete="off">
          <label>아이디
            <input name="username" required />
          </label>
          <label>비밀번호
            <input name="password" type="password" required />
          </label>
          <button class="button primary lg" type="submit">로그인</button>
          <p class="muted">계정이 없으신가요? <a href="#/signup">회원가입</a></p>
        </form>
      </div>
    </section>
  `;
}
export function ViewSignup() {
  if (state.session) return Already('이미 로그인되어 있습니다.', 'home');
  return `
    <section class="section auth">
      <div class="inner small">
        <h2>회원가입</h2>
        <form id="signupForm" class="form" autocomplete="off">
          <label>아이디
            <input name="username" required />
          </label>
          <label>비밀번호
            <input name="password" type="password" required minlength="4" />
          </label>
          <button class="button primary lg" type="submit">가입하기</button>
          <p class="muted"><a href="#/login">로그인</a>으로 이동</p>
        </form>
      </div>
    </section>
  `;
}

/* ===== Placeholders ===== */
export const ViewNews = () =>
  `<section class="section"><div class="inner"><h2>뉴스</h2><p class="muted">추후 데이터 연동</p></div></section>`;
export const ViewPlayers = () =>
  `<section class="section"><div class="inner"><h2>선수 소개</h2><p class="muted">추후 모달/검색</p></div></section>`;

/* ===== Helper UI ===== */
function CardProduct(p) {
  return `
    <article class="card product" data-id="${p.id}">
      <img src="${p.img}" alt="${p.title}" />
      <div class="card-body">
        <h4>${p.title}</h4>
        <div class="price">${fmt(p.price)}원</div>
        <div class="row">
          <button class="button primary" data-action="add-to-cart" data-id="${p.id}">장바구니</button>
          <button class="button ghost" data-action="buy-now" data-id="${p.id}">바로구매</button>
        </div>
      </div>
    </article>
  `;
}
function CartRow(it) {
  return `
    <div class="cart-row" data-id="${it.id}">
      <img src="${it.img}" alt="${it.title}" />
      <div class="meta">
        <div class="title">${it.title}</div>
        <div class="price">${fmt(it.price)}원</div>
        <div class="qty">
          <button class="icon" data-action="qty-dec" data-id="${it.id}">-</button>
          <span>${it.qty}</span>
          <button class="icon" data-action="qty-inc" data-id="${it.id}">+</button>
        </div>
      </div>
      <button class="button danger" data-action="remove" data-id="${it.id}">삭제</button>
    </div>
  `;
}
export function Gate(msg, goto) {
  return `<section class="section gate"><div class="inner"><p>${msg}</p><button class="button primary" data-link="${goto}">이동</button></div></section>`;
}
export function Already(msg, goto) {
  return `<section class="section gate"><div class="inner"><p>${msg}</p><button class="button primary" data-link="${goto}">확인</button></div></section>`;
}
