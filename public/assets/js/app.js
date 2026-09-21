import { IMAGES, PRODUCT_ORDER } from './data.js';
import { loadAll, readCache } from './store.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const SLIDE_MS = 4500;

let content = null;

/* ================= Helpers ================= */
function el(tag, attrs = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k === 'text') n.textContent = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) if (kid != null) n.append(kid);
  return n;
}
function icon(id) {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('class', 'ico'); s.setAttribute('aria-hidden', 'true');
  const u = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  u.setAttribute('href', '#' + id); s.append(u); return s;
}
const digits = v => String(v ?? '').replace(/[^\d.]/g, '');
function money(v) {
  const d = digits(v);
  if (!d) return String(v ?? '').trim();
  const n = Number(d);
  return Number.isFinite(n) ? '\u20B9' + n.toLocaleString('en-IN') : String(v);
}
function rateText(min, max) {
  const a = String(min ?? '').trim(), b = String(max ?? '').trim();
  if (a && b) return { main: `${money(a)} \u2013 ${money(b)}`, unit: ' per piece' };
  if (a || b) return { main: `From ${money(a || b)}`, unit: ' per piece' };
  return { main: 'On request', unit: '' };
}
function phoneDisplay(num) {
  const d = String(num).replace(/\D/g, '');
  const local = d.startsWith('91') && d.length === 12 ? d.slice(2) : d;
  return local.length === 10 ? `+91 ${local.slice(0, 5)} ${local.slice(5)}` : '+' + d;
}
function waLink(text) {
  const num = String(content.whatsapp).replace(/\D/g, '');
  return `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
}
function orderLink(name, exclusive = false) {
  return waLink(`Hello ${content.brand},\nI would like to order: *${name}*${exclusive ? ' (Exclusive)' : ''}\nPlease share the details.`);
}

/* ================= Bind store details ================= */
function bindContent() {
  const values = { ...content, phoneDisplay: phoneDisplay(content.whatsapp) };
  $$('[data-bind]').forEach(n => { const k = n.dataset.bind; if (k in values) n.textContent = values[k]; });
  $$('[data-wa-general]').forEach(a => a.href = waLink(`Hello ${content.brand}, I would like to place an order.`));
  $$('[data-ig-dm]').forEach(a => a.href = `https://ig.me/m/${content.instagram.replace(/^@/, '')}`);
  $$('[data-maps]').forEach(a => a.href = content.mapsUrl);
}

/* ================= Card slideshow =================
   Each card swaps between its two photos. Timing is driven by the progress bar
   animation, staggered per card, paused when off-screen or while hovered. */
const slideshows = new Map();

function makeSlideshow(card, order) {
  const imgs = $$('.card__img', card);
  const tag = $('.card__tag', card);
  const bar = $('.card__progress i', card);
  if (imgs.length < 2 || !bar) return;
  const s = { idx: 0, visible: false, hover: false, started: false };
  const labels = imgs.map(i => i.dataset.label);

  const run = (delay = 0) => {
    bar.classList.remove('is-running');
    void bar.offsetWidth; // restart animation
    bar.style.animationDelay = delay + 'ms';
    bar.classList.add('is-running');
    sync();
  };
  const show = i => {
    s.idx = (i + imgs.length) % imgs.length;
    imgs.forEach((im, k) => im.classList.toggle('is-on', k === s.idx));
    if (tag) tag.textContent = labels[s.idx];
  };
  const sync = () => bar.classList.toggle('is-paused', !s.visible || s.hover || document.hidden);

  bar.style.setProperty('--dur', SLIDE_MS + 'ms');
  bar.addEventListener('animationend', () => { show(s.idx + 1); run(0); });
  $('.card__media', card).addEventListener('click', () => { show(s.idx + 1); run(0); });
  card.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') { s.hover = true; sync(); } });
  card.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') { s.hover = false; sync(); } });

  s.setVisible = v => {
    s.visible = v;
    if (v && !s.started && !reduceMotion) { s.started = true; run((order % 4) * 1100); }
    else sync();
  };
  s.sync = sync;
  slideshows.set(card, s);
  io.observe(card);
}
const io = new IntersectionObserver(entries => {
  entries.forEach(e => slideshows.get(e.target)?.setVisible(e.isIntersecting));
}, { threshold: 0.35 });
document.addEventListener('visibilitychange', () => slideshows.forEach(s => s.sync()));

/* ================= Cards ================= */
function buildCard({ name, type, images, badge, onAbout, orderHref, order }) {
  const media = el('div', { class: 'card__media', role: 'button', tabindex: '0', 'aria-label': `Switch photo of ${name}` },
    images.map((im, i) => el('img', {
      class: 'card__img' + (i === 0 ? ' is-on' : ''), src: im.src, alt: `${name}, ${im.label.toLowerCase()}`,
      'data-label': im.label, loading: order < 2 && i === 0 ? 'eager' : 'lazy', decoding: 'async', width: '800', height: '1200'
    })),
    badge ? el('span', { class: 'card__badge', text: badge }) : null,
    images.length > 1 ? el('span', { class: 'card__tag', text: images[0].label, 'aria-hidden': 'true' }) : null,
    images.length > 1 ? el('span', { class: 'card__progress', 'aria-hidden': 'true' }, el('i')) : null
  );
  media.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); media.click(); } });

  const aboutBtn = onAbout ? el('button', { class: 'btn btn--line', type: 'button' }, icon('i-info'), 'About this product') : null;
  const orderBtn = el('a', { class: 'btn btn--gold', href: orderHref, target: '_blank', rel: 'noopener' }, icon('i-wa'), 'Order it');

  const card = el('article', { class: 'card' },
    media,
    el('div', { class: 'card__body' },
      type ? el('p', { class: 'card__type', text: type }) : null,
      el('h3', { class: 'card__name', text: name }),
      el('div', { class: 'card__actions' + (aboutBtn ? '' : ' card__actions--single') }, aboutBtn, orderBtn)
    )
  );
  if (aboutBtn) aboutBtn.addEventListener('click', () => onAbout(card));
  return card;
}

function dispose(container) {
  $$('.card', container).forEach(c => { io.unobserve(c); slideshows.delete(c); });
  container.replaceChildren();
}

function renderProducts() {
  const grid = $('#product-grid');
  dispose(grid);
  PRODUCT_ORDER.forEach((id, i) => {
    const p = content.products[id];
    if (!p) return;
    const imgs = [{ src: IMAGES[id].box, label: 'In the box' }, { src: IMAGES[id].use, label: 'As worn' }];
    const card = buildCard({
      name: p.name, type: p.type, images: imgs, order: i,
      orderHref: orderLink(p.name),
      onAbout: c => openSheet(c, {
        name: p.name, finish: p.finish, type: p.type, uses: p.uses,
        rate: rateText(p.rateMin, p.rateMax), images: imgs, orderHref: orderLink(p.name)
      })
    });
    grid.append(card);
    makeSlideshow(card, i);
  });
}

function renderExclusive(items) {
  const sec = $('#exclusive'), rail = $('#exclusive-grid');
  dispose(rail);
  const list = (items || []).filter(x => x && x.active !== false && x.image_url);
  sec.hidden = !list.length;
  $$('[data-exclusive-link]').forEach(a => a.hidden = !list.length);
  list.forEach((x, i) => {
    const imgs = [{ src: x.image_url, label: 'In the box' }];
    if (x.image2_url) imgs.push({ src: x.image2_url, label: 'As worn' });
    const hasDetail = x.type || x.note || x.rate_min || x.rate_max;
    const card = buildCard({
      name: x.name, type: x.type, images: imgs, badge: 'Trending', order: i,
      orderHref: orderLink(x.name, true),
      onAbout: hasDetail ? c => openSheet(c, {
        name: x.name, finish: '', type: x.type || 'Exclusive piece', uses: x.note,
        rate: rateText(x.rate_min, x.rate_max), images: imgs, orderHref: orderLink(x.name, true)
      }) : null
    });
    rail.append(card);
    makeSlideshow(card, i);
  });
}

/* ================= Detail sheet (expands from the card) ================= */
const sheet = $('#sheet');
const panel = $('.sheet__panel', sheet);
const track = $('#sheet-track');
const dots = $('#sheet-dots');
let originCard = null, lastFocus = null;

function openSheet(card, d) {
  originCard = card; lastFocus = document.activeElement;
  $('#sheet-name').textContent = d.name;
  const fin = $('#sheet-finish'); fin.textContent = d.finish || ''; fin.hidden = !d.finish;
  $('#sheet-type').textContent = d.type || '';
  const uses = $('#sheet-uses'); uses.textContent = d.uses || ''; uses.hidden = !d.uses;
  const rate = $('#sheet-rate'); rate.replaceChildren(d.rate.main, d.rate.unit ? el('small', { text: d.rate.unit }) : '');
  $('#sheet-order').href = d.orderHref;

  track.replaceChildren(...d.images.map(im => el('img', { src: im.src, alt: `${d.name}, ${im.label.toLowerCase()}`, decoding: 'async' })));
  dots.replaceChildren(...(d.images.length > 1 ? d.images.map((im, i) => el('button', {
    type: 'button', 'aria-label': `Show photo: ${im.label}`, 'aria-current': i === 0 ? 'true' : 'false',
    onclick: () => track.scrollTo({ left: track.clientWidth * i, behavior: reduceMotion ? 'auto' : 'smooth' })
  })) : []));
  track.scrollLeft = 0;

  sheet.hidden = false;
  document.body.classList.add('is-locked');
  $('.fab')?.classList.add('is-hidden');
  panel.scrollTop = 0;
  requestAnimationFrame(() => {
    sheet.classList.add('is-open');
    grow(card, false);
    panel.focus({ preventScroll: true });
  });
  history.pushState({ sheet: true }, '');
}

function grow(card, reverse) {
  if (reduceMotion) return Promise.resolve();
  const from = card.getBoundingClientRect();
  const to = panel.getBoundingClientRect();
  const onScreen = from.bottom > 0 && from.top < innerHeight;
  const start = onScreen
    ? `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width}, ${from.height / to.height})`
    : 'translateY(40px)';
  const frames = [
    { transform: start, opacity: onScreen ? 0.4 : 0, transformOrigin: 'top left' },
    { transform: 'none', opacity: 1, transformOrigin: 'top left' }
  ];
  const anim = panel.animate(reverse ? frames.reverse() : frames, {
    duration: reverse ? 320 : 460, easing: 'cubic-bezier(.2,.8,.2,1)', fill: reverse ? 'forwards' : 'none'
  });
  return anim.finished;
}

async function closeSheet(fromHistory = false) {
  if (sheet.hidden) return;
  sheet.classList.remove('is-open');
  if (originCard) await grow(originCard, true).catch(() => {});
  panel.getAnimations().forEach(a => a.cancel());
  sheet.hidden = true;
  document.body.classList.remove('is-locked');
  $('.fab')?.classList.remove('is-hidden');
  lastFocus?.focus?.({ preventScroll: true });
  if (!fromHistory && history.state?.sheet) history.back();
}

sheet.addEventListener('click', e => { if (e.target.closest('[data-close]')) closeSheet(); });
document.addEventListener('keydown', e => {
  if (sheet.hidden) return;
  if (e.key === 'Escape') closeSheet();
  if (e.key === 'Tab') { // keep focus inside the dialog
    const f = $$('button, a[href]', panel).filter(n => n.offsetParent);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});
addEventListener('popstate', () => { if (!sheet.hidden) closeSheet(true); });
track.addEventListener('scroll', () => {
  const i = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
  $$('button', dots).forEach((b, k) => b.setAttribute('aria-current', k === i ? 'true' : 'false'));
}, { passive: true });

/* ================= Owner double tap opens admin ================= */
(() => {
  const name = $('#owner-name');
  let last = 0;
  name.addEventListener('pointerup', () => {
    const now = Date.now();
    if (now - last < 450) { last = 0; location.href = 'admin.html'; }
    else last = now;
  });
})();

/* ================= Top bar + FAB ================= */
const topbar = $('.topbar');
const fab = $('.fab');
const heroEnd = () => $('.hero').offsetHeight * 0.6;
function onScroll() {
  topbar.classList.toggle('is-scrolled', scrollY > 8);
  if (sheet.hidden) fab.classList.toggle('is-hidden', scrollY < heroEnd());
}
addEventListener('scroll', onScroll, { passive: true });

/* ================= Boot ================= */
$('#year').textContent = new Date().getFullYear();
const cached = readCache();
content = cached.content;
bindContent();
renderProducts();
renderExclusive(cached.exclusive);
onScroll();

loadAll().then(({ content: fresh, exclusive }) => {
  const changed = JSON.stringify(fresh) !== JSON.stringify(content);
  content = fresh;
  bindContent();
  if (changed) renderProducts();
  renderExclusive(exclusive);
}).catch(err => console.warn('Live content unavailable, showing saved copy.', err));
