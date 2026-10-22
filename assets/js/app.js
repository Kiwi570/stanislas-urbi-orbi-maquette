/* Stanislas Urbi & Orbi — socle commun (langue, mode calme, son, défilement, curseur, visionneuse) */
import { Lenis } from '../vendor/lenis/lenis.js';

const html = document.documentElement;
const page = html.dataset.page;
const { gsap, ScrollTrigger, SplitText } = window;
gsap.registerPlugin(ScrollTrigger, SplitText);

const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
const isCalm = () => html.classList.contains('calm');
const lang = () => html.dataset.lang || 'fr';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* stockage indisponible */ } },
  sget(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
  sset(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* stockage indisponible */ } }
};

try { history.scrollRestoration = 'manual'; } catch (e) { /* ignore */ }
const SUO = (window.SUO = { gsap, ScrollTrigger, isCalm, lang, fine, $, $$, langFns: [], ready: [] });
SUO.onLang = (fn) => SUO.langFns.push(fn);
SUO.fmt = (n, d = 0) => new Intl.NumberFormat(lang() === 'en' ? 'en-GB' : 'fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d }).format(n);

/* ---------- langue ---------- */
function applyLang(l) {
  html.dataset.lang = l;
  html.lang = l;
  $$('[data-set-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.setLang === l)));
  $$('[data-alt-fr]').forEach((im) => { im.alt = im.dataset[l === 'en' ? 'altEn' : 'altFr']; });
  $$('option[data-l-fr]').forEach((o) => { o.textContent = o.dataset[l === 'en' ? 'lEn' : 'lFr']; });
  SUO.langFns.forEach((fn) => fn(l));
}
$$('[data-set-lang]').forEach((b) => b.addEventListener('click', () => {
  store.set('suo-lang', b.dataset.setLang);
  applyLang(b.dataset.setLang);
  ScrollTrigger.refresh();
}));

/* ---------- mode calme ---------- */
const calmBtn = $('[data-calm]');
if (calmBtn) {
  calmBtn.setAttribute('aria-pressed', String(isCalm()));
  calmBtn.addEventListener('click', () => {
    store.set('suo-calm', isCalm() ? '0' : '1');
    store.sset('suo-scroll', String(window.scrollY));
    store.sset('suo-seen', '1');
    location.reload();
  });
}

/* ---------- son (uniquement après un geste du visiteur) ---------- */
const sound = (SUO.sound = { on: false, ctx: null, master: null,
  start() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const ctx = (this.ctx = new AC());
      const master = (this.master = ctx.createGain());
      master.gain.value = 0;
      master.connect(ctx.destination);
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass'; filter.frequency.value = 520; filter.Q.value = 0.7;
      filter.connect(master);
      [110, 164.81, 220.5].forEach((f, i) => {
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.type = i === 2 ? 'triangle' : 'sine'; o.frequency.value = f; g.gain.value = i === 2 ? 0.05 : 0.12;
        o.connect(g); g.connect(filter); o.start();
      });
      const lfo = ctx.createOscillator(); const lg = ctx.createGain();
      lfo.frequency.value = 0.06; lg.gain.value = 260; lfo.connect(lg); lg.connect(filter.frequency); lfo.start();
    }
    this.ctx.resume();
    this.master.gain.cancelScheduledValues(this.ctx.currentTime);
    this.master.gain.linearRampToValueAtTime(0.18, this.ctx.currentTime + 1.2);
    this.on = true;
  },
  stop() {
    if (!this.ctx) return;
    this.master.gain.cancelScheduledValues(this.ctx.currentTime);
    this.master.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.6);
    this.on = false;
  },
  ping(freq = 880) {
    if (!this.on || !this.ctx) return;
    const ctx = this.ctx; const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.4);
    o.connect(g); g.connect(this.master); o.start(); o.stop(ctx.currentTime + 1.5);
  }
});
const soundBtn = $('[data-sound]');
if (soundBtn) soundBtn.addEventListener('click', () => {
  if (sound.on) sound.stop(); else sound.start();
  soundBtn.setAttribute('aria-pressed', String(sound.on));
});

/* ---------- défilement fluide ---------- */
let lenis = null;
if (!isCalm()) {
  lenis = new Lenis({ lerp: 0.11, smoothWheel: true, wheelMultiplier: 1 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  html.classList.add('lenis');
}
SUO.lenis = lenis;
SUO.scrollTo = (target, opts = {}) => {
  if (lenis) lenis.scrollTo(target, { duration: 1.4, ...opts });
  else {
    const y = typeof target === 'number' ? target : (target.getBoundingClientRect().top + window.scrollY + (opts.offset || 0));
    window.scrollTo({ top: y, behavior: 'auto' });
  }
};
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"], a[href*=".html#"]');
  if (!a) return;
  const url = new URL(a.href, location.href);
  if (url.pathname !== location.pathname || !url.hash || url.hash === '#') return;
  const el = document.getElementById(decodeURIComponent(url.hash.slice(1)));
  if (!el) return;
  e.preventDefault();
  closeMenu();
  const custom = new CustomEvent('suo:goto', { detail: { id: el.id }, cancelable: true });
  if (!document.dispatchEvent(custom)) return;
  SUO.scrollTo(el, { offset: 0 });
  history.replaceState(null, '', url.hash);
});

/* ---------- en-tête, menu, fil rouge ---------- */
const header = $('.site-header');
let lastY = 0;
ScrollTrigger.create({
  start: 0, end: 'max',
  onUpdate(self) {
    const y = self.scroll();
    header.classList.toggle('is-solid', y > 40);
    lastY = y;
    const p = self.progress;
    gsap.set('.thread-fill', { scaleY: p });
    gsap.set('.thread-head', { top: (p * 100) + '%' });
  }
});
$$('[data-night]').forEach((sec) => ScrollTrigger.create({
  trigger: sec, start: 'top 64px', end: 'bottom 64px',
  onToggle: (s) => html.classList.toggle('on-night-zone', s.isActive)
}));
let menuOpen = false;
const menuBtn = $('[data-menu]');
const mobileNav = $('#mobile-nav');
function closeMenu() {
  if (!menuOpen) return;
  menuOpen = false; mobileNav.classList.remove('is-open'); menuBtn.setAttribute('aria-expanded', 'false');
  lenis && lenis.start();
}
if (menuBtn) menuBtn.addEventListener('click', () => {
  menuOpen = !menuOpen;
  mobileNav.classList.toggle('is-open', menuOpen);
  menuBtn.setAttribute('aria-expanded', String(menuOpen));
  if (menuOpen) { lenis && lenis.stop(); header.classList.remove('is-hidden'); } else { lenis && lenis.start(); }
});
$$('#mobile-nav a').forEach((a) => a.addEventListener('click', closeMenu));

/* ---------- curseur ---------- */
const cursor = $('.cursor');
if (fine && !isCalm() && cursor) {
  html.classList.add('has-cursor');
  const label = $('.cursor-label', cursor);
  const qx = gsap.quickTo(cursor, 'x', { duration: 0.18, ease: 'power3' });
  const qy = gsap.quickTo(cursor, 'y', { duration: 0.18, ease: 'power3' });
  window.addEventListener('pointermove', (e) => {
    qx(e.clientX); qy(e.clientY);
    cursor.classList.add('is-live');
    const t = e.target;
    const zoom = t.closest && t.closest('[data-zoomable]');
    const inter = t.closest && t.closest('a, button, select, input, textarea, label, [data-wall]');
    const cross = t.closest && t.closest('[data-cursor="cross"]');
    cursor.classList.toggle('is-hover', !!inter && !zoom);
    cursor.classList.toggle('is-cross', !!cross && !inter && !zoom);
    cursor.classList.toggle('has-label', !!zoom);
    if (zoom) label.textContent = lang() === 'en' ? 'enlarge' : 'agrandir';
    else if (cross) label.textContent = lang() === 'en' ? 'sighting' : 'visée';
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => cursor.classList.remove('is-live'));
}

/* ---------- boutons magnétiques & inclinaisons ---------- */
if (fine && !isCalm()) {
  $$('[data-magnetic]').forEach((el) => {
    const xTo = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'elastic.out(1, 0.4)' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'elastic.out(1, 0.4)' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - (r.left + r.width / 2)) * 0.35);
      yTo((e.clientY - (r.top + r.height / 2)) * 0.45);
    });
    el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
  });
  $$('[data-tilt]').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5; const py = (e.clientY - r.top) / r.height - 0.5;
      gsap.to(el, { rotateY: px * 14, rotateX: -py * 14, transformPerspective: 700, duration: 0.5, ease: 'power2.out' });
    });
    el.addEventListener('pointerleave', () => gsap.to(el, { rotateY: 0, rotateX: 0, duration: 0.8, ease: 'elastic.out(1,0.5)' }));
  });
}

/* ---------- titres révélés ---------- */
function splitHeadings() {
  $$('[data-split]').forEach((el) => {
    if (el.closest('.hero') || isCalm()) { el.classList.add('is-split'); return; }
    const targets = $$('[data-l]', el).length ? $$('[data-l]', el) : [el];
    const words = [];
    targets.forEach((tg) => {
      const s = new SplitText(tg, { type: 'lines,words', linesClass: 'split-line' });
      words.push(...s.words);
    });
    el.classList.add('is-split');
    gsap.from(words, {
      yPercent: 115, rotate: 3, duration: 1.1, ease: 'expo.out', stagger: 0.045,
      scrollTrigger: { trigger: el, start: 'top 86%', once: true }
    });
  });
}

/* ---------- compteurs ---------- */
function counters() {
  $$('[data-count-to]').forEach((el) => {
    const to = parseFloat(el.dataset.countTo);
    const render = (v) => { el.textContent = SUO.fmt(Math.round(v)); };
    render(to);
    if (isCalm()) return;
    const o = { v: 0 };
    ScrollTrigger.create({ trigger: el, start: 'top 85%', once: true, onEnter: () => {
      gsap.fromTo(o, { v: 0 }, { v: to, duration: 2.2, ease: 'power3.out', onUpdate: () => render(o.v) });
    } });
    SUO.onLang(() => render(to));
  });
}

/* ---------- défilement horizontal à la souris ---------- */
$$('[data-drag-scroll]').forEach((el) => {
  let down = false; let sx = 0; let sl = 0; let moved = false;
  el.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') return; down = true; moved = false; sx = e.clientX; sl = el.scrollLeft; });
  window.addEventListener('pointermove', (e) => { if (!down) return; const dx = e.clientX - sx; if (Math.abs(dx) > 4) moved = true; el.scrollLeft = sl - dx; });
  window.addEventListener('pointerup', () => { down = false; });
  el.addEventListener('click', (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); } }, true);
});

/* ---------- bandeau défilant ---------- */
function marquee() {
  $$('[data-marquee]').forEach((m) => {
    if (isCalm()) return;
    m.innerHTML += m.innerHTML;
    const tw = gsap.to(m, { xPercent: -50, ease: 'none', duration: 40, repeat: -1 });
    ScrollTrigger.create({ trigger: m, start: 'top bottom', end: 'bottom top', onUpdate: (s) => {
      const v = Math.min(Math.abs(s.getVelocity()) / 400, 6);
      gsap.to(tw, { timeScale: 1 + v, duration: 0.3, overwrite: true });
      gsap.to(tw, { timeScale: 1, duration: 1.2, delay: 0.3 });
    } });
  });
}

/* ---------- coupures de presse en éventail ---------- */
function clips() {
  $$('[data-clips]').forEach((box) => {
    const items = $$('.clip', box); const n = items.length;
    const layout = (spread) => items.forEach((c, i) => {
      const k = i - (n - 1) / 2;
      gsap.to(c, { xPercent: -50 + k * (spread ? 34 : 9), yPercent: -50 + Math.abs(k) * (spread ? 6 : 2), rotate: k * (spread ? 7 : 3.5), duration: 0.9, ease: 'expo.out' });
    });
    items.forEach((c, i) => gsap.set(c, { xPercent: -50, yPercent: -50, rotate: (i % 2 ? 1 : -1) * 2, zIndex: i }));
    if (isCalm()) { layout(true); return; }
    ScrollTrigger.create({ trigger: box, start: 'top 70%', once: true, onEnter: () => layout(false) });
    box.addEventListener('pointerenter', () => layout(true));
    box.addEventListener('pointerleave', () => layout(false));
    if (!fine) ScrollTrigger.create({ trigger: box, start: 'top 50%', once: true, onEnter: () => layout(true) });
    items.forEach((c) => c.addEventListener('pointerenter', () => gsap.to(c, { y: -18, duration: 0.4 })));
    items.forEach((c) => c.addEventListener('pointerleave', () => gsap.to(c, { y: 0, duration: 0.4 })));
  });
}

/* ---------- visionneuse ---------- */
const lb = $('.lightbox');
const lbImg = lb && $('.lb-media img', lb);
const lbInfo = lb && $('.lb-info', lb);
let lbReturn = null; let lbItems = []; let lbIndex = 0;
function lbRender() {
  const el = lbItems[lbIndex];
  const src = el.dataset.src || ($('img', el) && $('img', el).src);
  lbImg.src = src;
  const cap = el.dataset[lang() === 'en' ? 'capEn' : 'capFr'] || '';
  lbImg.alt = cap;
  const wall = el.hasAttribute('data-wall');
  lb.classList.remove('is-wall');
  lb.classList.toggle('is-portrait', !!el.dataset.mail);
  const L = lang() === 'en';
  lbInfo.innerHTML = `<h3 class="h3"></h3>
    ${wall ? `<p class="small">${L ? 'Dimensions to be completed: the wall view uses an indicative scale.' : 'Dimensions à compléter : la vue au mur utilise une échelle indicative.'}</p>` : ''}
    <div class="lb-nav">
      ${lbItems.length > 1 ? `<button type="button" class="tool" data-lb-prev>${L ? 'Previous' : 'Précédente'}</button><button type="button" class="tool" data-lb-next>${L ? 'Next' : 'Suivante'}</button>` : ''}
      ${wall ? `<button type="button" class="tool" data-lb-wall aria-pressed="false">${L ? 'See on the wall' : 'Voir au mur'}</button>` : ''}
      ${el.dataset.mail ? `<a class="tool" href="mailto:stanislasurbietorbi@wanadoo.fr?subject=${encodeURIComponent(el.dataset.mail)}">${L ? 'This is me: write to Daniel Denise' : 'C’est moi : écrire à Daniel Denise'}</a>` : ''}
    </div>`;
  $('h3', lbInfo).textContent = cap;
}
SUO.openLightbox = (el, group) => {
  lbReturn = document.activeElement;
  lbItems = group && group.length ? group : [el];
  lbIndex = Math.max(0, lbItems.indexOf(el));
  lbRender();
  lb.classList.add('is-open');
  lenis && lenis.stop();
  $('[data-lb-close]', lb).focus();
};
function lbClose() { lb.classList.remove('is-open', 'is-wall'); lenis && lenis.start(); lbReturn && lbReturn.focus && lbReturn.focus(); }
if (lb) {
  lb.addEventListener('click', (e) => {
    if (e.target.closest('[data-lb-close]') || e.target === lb) return lbClose();
    if (e.target.closest('[data-lb-next]')) { lbIndex = (lbIndex + 1) % lbItems.length; return lbRender(); }
    if (e.target.closest('[data-lb-prev]')) { lbIndex = (lbIndex - 1 + lbItems.length) % lbItems.length; return lbRender(); }
    const w = e.target.closest('[data-lb-wall]');
    if (w) { const on = lb.classList.toggle('is-wall'); w.setAttribute('aria-pressed', String(on)); }
  });
  document.addEventListener('keydown', (e) => {
    if (!lb.classList.contains('is-open')) return;
    if (e.key === 'Escape') lbClose();
    if (e.key === 'ArrowRight' && lbItems.length > 1) { lbIndex = (lbIndex + 1) % lbItems.length; lbRender(); }
    if (e.key === 'ArrowLeft' && lbItems.length > 1) { lbIndex = (lbIndex - 1 + lbItems.length) % lbItems.length; lbRender(); }
    if (e.key === 'Tab') {
      const f = $$('button, a', lb); const first = f[0]; const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  $$('[data-zoomable]').forEach((el) => {
    el.setAttribute('tabindex', '0');
    el.setAttribute('role', 'button');
    const open = () => {
      const scope = el.closest('[data-clips], .works, .strip, .livre-photos, .nancy-photos, .trio, .makingof, .pr-photos') || null;
      const group = scope ? $$('[data-zoomable]', scope.closest('.visit-track') || scope) : null;
      SUO.openLightbox(el, group);
    };
    el.addEventListener('click', open);
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
  });
  SUO.onLang(() => { if (lb.classList.contains('is-open')) lbRender(); });
}

/* ---------- loupe ---------- */
const lens = $('.lens');
if (fine && lens) {
  $$('[data-lens]').forEach((el) => {
    const im = $('img', el); if (!im) return;
    el.addEventListener('pointerenter', () => { lens.style.backgroundImage = `url(${im.currentSrc || im.src})`; lens.classList.add('is-on'); $('.cursor') && $('.cursor').classList.add('is-lens'); });
    el.addEventListener('pointerleave', () => { lens.classList.remove('is-on'); $('.cursor') && $('.cursor').classList.remove('is-lens'); });
    el.addEventListener('pointermove', (e) => {
      const r = im.getBoundingClientRect(); const z = 2.6;
      const x = (e.clientX - r.left) / r.width; const y = (e.clientY - r.top) / r.height;
      if (x < 0 || x > 1 || y < 0 || y > 1) { lens.classList.remove('is-on'); return; }
      lens.classList.add('is-on');
      lens.style.left = e.clientX + 'px'; lens.style.top = e.clientY + 'px';
      lens.style.backgroundSize = `${r.width * z}px ${r.height * z}px`;
      lens.style.backgroundPosition = `${-(x * r.width * z - 90)}px ${-(y * r.height * z - 90)}px`;
    });
  });
}

/* ---------- formulaires de démonstration ---------- */
$$('[data-fake-form]').forEach((f) => {
  const qty = $('[data-qty]', f); const tot = $('[data-total-val]', f);
  const upd = () => { if (qty && tot) tot.textContent = SUO.fmt(Math.max(1, Math.min(10, parseInt(qty.value || '1', 10))) * 15) + ' €'; };
  if (qty) { qty.addEventListener('input', upd); SUO.onLang(upd); upd(); }
  f.addEventListener('submit', (e) => {
    e.preventDefault();
    const bad = $$('[required]', f).find((i) => !i.value.trim() || (i.type === 'email' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(i.value)));
    if (bad) { bad.focus(); bad.setAttribute('aria-invalid', 'true'); return; }
    $$('[aria-invalid]', f).forEach((i) => i.removeAttribute('aria-invalid'));
    f.classList.add('is-sent');
    const ok = $('.form-ok', f); ok && ok.setAttribute('tabindex', '-1'); ok && ok.focus();
  });
});

/* ---------- images Grok / ChatGPT (si fournies) ---------- */
function applyGrok(list) {
  const set = new Set(list || []);
  $$('.ph[data-grok]').forEach((ph) => {
    if (ph.classList.contains('has-img') || !set.has(ph.dataset.grok)) return;
    const hasM = ph.dataset.grokM && set.has(ph.dataset.grokM);
    const d = document.createElement('div'); d.className = 'ph-img' + (hasM ? ' ph-d' : ''); d.style.backgroundImage = `url(assets/img/grok/${ph.dataset.grok}.webp)`; ph.prepend(d);
    if (hasM) { const m = document.createElement('div'); m.className = 'ph-img ph-m'; m.style.backgroundImage = `url(assets/img/grok/${ph.dataset.grokM}.webp)`; d.after(m); }
    ph.classList.add('has-img');
  });
  if (set.has('g-portraits-fond-papier-3x2')) html.classList.add('has-portrait-bg');
}
fetch('assets/img/grok/manifest.json').then((r) => (r.ok ? r.json() : [])).then(applyGrok).catch(() => {});

/* ---------- ouverture ---------- */
function intro() {
  const loader = $('.loader');
  const done = () => { store.sset('suo-seen', '1'); document.dispatchEvent(new Event('suo:intro')); };
  if (!loader || html.classList.contains('no-loader') || isCalm()) { if (loader) loader.remove(); done(); return; }
  const u = $('.uo-u', loader); const o = $('.uo-o', loader); const j = $('.uo-j', loader);
  [u, o, j].forEach((p) => { const L = p.getTotalLength(); gsap.set(p, { strokeDasharray: L, strokeDashoffset: L }); });
  const lat = $('.lc-lat', loader); const lon = $('.lc-lon', loader);
  const c = { v: 0 };
  const tl = gsap.timeline({ onComplete: () => { loader.remove(); } });
  tl.to(u, { strokeDashoffset: 0, duration: 0.7, ease: 'power2.inOut' })
    .to(o, { strokeDashoffset: 0, duration: 0.7, ease: 'power2.inOut' }, 0.25)
    .to(j, { strokeDashoffset: 0, duration: 0.35, ease: 'power2.out' }, 0.7)
    .to(c, { v: 1, duration: 1.0, ease: 'power2.out', onUpdate: () => {
      const a = 48.693548 * c.v; const b = 6.183272 * c.v;
      lat.textContent = dms(a, lang() === 'en') + ' N'; lon.textContent = dms(b, lang() === 'en') + ' E';
    } }, 0.2)
    .to('.loader-line', { scaleX: 1, duration: 0.6, ease: 'expo.inOut' }, 1.15)
    .add(done, 1.55)
    .to(loader, { yPercent: -100, duration: 0.8, ease: 'expo.inOut' }, 1.6);
}
function dms(v, en) {
  const d = Math.floor(v); const mf = (v - d) * 60; const m = Math.floor(mf); const s = (mf - m) * 60;
  const ss = s.toFixed(2).padStart(5, '0').replace('.', en ? '.' : ',');
  return `${d}°${String(m).padStart(2, '0')}′${ss}″`;
}
SUO.dms = dms;

/* ---------- démarrage ---------- */
function boot() {
  applyLang(lang());
  splitHeadings();
  counters();
  marquee();
  clips();
  const mod = { home: './home.js', exposition: './expo.js', portraits: './wall.js' }[page];
  const after = () => {
    intro();
    ScrollTrigger.refresh();
    const sy = store.sget('suo-scroll');
    if (sy) { store.sset('suo-scroll', ''); window.scrollTo(0, parseInt(sy, 10) || 0); }
    else if (!location.hash) { window.scrollTo(0, 0); if (lenis) lenis.scrollTo(0, { immediate: true }); }
    else if (location.hash) {
      const el = document.getElementById(location.hash.slice(1));
      if (el) {
        const ev = new CustomEvent('suo:goto', { detail: { id: el.id, instant: true }, cancelable: true });
        if (document.dispatchEvent(ev)) setTimeout(() => SUO.scrollTo(el, { immediate: true }), 60);
      }
    }
  };
  if (mod) import(mod).then((m) => m.default && m.default(SUO)).catch((e) => console.warn('module', e)).finally(after);
  else after();
}
if (document.fonts && document.fonts.ready) {
  Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1200))]).then(boot);
} else boot();
