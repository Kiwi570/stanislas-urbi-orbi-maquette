/* Page Portraits : mur interactif des 1 455 portraits (canvas 2D) */
export default async function wall(SUO) {
  const { gsap, ScrollTrigger, $, $$, isCalm, lang } = SUO;
  const calm = isCalm();

  /* héros */
  if (!calm) {
    const h1 = $('#pr-title'); const words = [];
    $$('[data-l]', h1).forEach((sp) => { const s = new SplitText(sp, { type: 'lines,words', linesClass: 'split-line' }); words.push(...s.words); });
    gsap.timeline({ delay: 0.15, defaults: { ease: 'expo.out' } })
      .from(words, { yPercent: 118, duration: 1.2, stagger: 0.07 })
      .from('.pr-hero .lede, .pr-hero .small', { y: 20, opacity: 0, duration: 1, stagger: 0.1 }, 0.5)
      .from('.pr-hero .ph-art', { scale: 1.08, duration: 2.4 }, 0);
    gsap.from('.pr-photos figure', { y: 60, opacity: 0, stagger: 0.08, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: '.pr-photos', start: 'top 85%', once: true } });
  }

  const cv = $('[data-wall]'); if (!cv) return;
  const sec = $('[data-wall-sec]');
  const ctx = cv.getContext('2d');
  const data = await fetch('assets/portraits/portraits.json').then((r) => r.json());
  const atlas = new Image(); atlas.decoding = 'async'; atlas.src = 'assets/portraits/atlas.webp';
  await new Promise((r) => { atlas.onload = r; atlas.onerror = r; });

  const [CW, CH] = data.cell; const ACOLS = data.cols; const N = data.count;
  const [PW, PH] = data.full;
  const items = data.items.map(([f, n, s], i) => ({ i, f, n, s, x: 0, y: 0, tx: 0, ty: 0, a: 1 }));
  const CELL_H = 100; const CELL_W = CELL_H * (CW / CH); const GAP = 10;
  const aspect0 = Math.max(0.5, (cv.clientWidth || 1200) / (cv.clientHeight || 800));
  const COLS = Math.max(18, Math.min(90, Math.round(Math.sqrt(N * aspect0 * (CELL_H + GAP) / (CELL_W + GAP)))));
  const ROWS = Math.ceil(N / COLS);
  const WORLD_W = COLS * (CELL_W + GAP); const WORLD_H = ROWS * (CELL_H + GAP);
  let order = items.map((it) => it.i);

  const placeAll = (instant) => {
    order.forEach((idx, k) => {
      const it = items[idx];
      it.tx = (k % COLS) * (CELL_W + GAP); it.ty = Math.floor(k / COLS) * (CELL_H + GAP);
      if (instant) { it.x = it.tx; it.y = it.ty; }
    });
  };
  const shuffle = () => { for (let i = order.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [order[i], order[j]] = [order[j], order[i]]; } };

  // caméra
  let W = 0; let H = 0; let dpr = 1;
  const cam = { x: WORLD_W / 2, y: WORLD_H / 2, z: 0.2 };
  const target = { x: cam.x, y: cam.y, z: cam.z };
  const fitZoom = () => Math.min(W / (WORLD_W + 80), H / (WORLD_H + 80));
  const resize = () => {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = cv.clientWidth; H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr;
  };
  resize();
  window.addEventListener('resize', () => { resize(); dirty = true; });
  const clampCam = () => {
    const mz = fitZoom() * 0.9; const Mz = 2.4;
    target.z = Math.max(mz, Math.min(Mz, target.z));
    const hw = W / 2 / target.z; const hh = H / 2 / target.z;
    target.x = WORLD_W / 2 < hw ? WORLD_W / 2 : Math.max(hw - 40, Math.min(WORLD_W - hw + 40, target.x));
    target.y = WORLD_H / 2 < hh ? WORLD_H / 2 : Math.max(hh - 40, Math.min(WORLD_H - hh + 40, target.y));
  };

  // planches haute définition, une par fiche, chargées à la demande
  const sheets = new Map();
  const loadSheet = (f) => {
    let c = sheets.get(f);
    if (c) return c;
    const img = new Image(); img.decoding = 'async';
    c = { img, ready: false, p: null };
    c.p = new Promise((res) => { img.onload = () => { c.ready = true; dirty = true; res(img); }; img.onerror = () => res(null); });
    img.src = `assets/portraits/f/fiche-${String(f).padStart(2, '0')}.webp`;
    sheets.set(f, c); return c;
  };
  const getImg = (it) => { const c = loadSheet(it.f); return c.ready ? c.img : null; };

  let hover = null; let highlightFiche = 0; let dirty = true; let visible = false;
  const toScreen = (x, y) => [(x - cam.x) * cam.z + W / 2, (y - cam.y) * cam.z + H / 2];
  const toWorld = (sx, sy) => [(sx - W / 2) / cam.z + cam.x, (sy - H / 2) / cam.z + cam.y];

  const draw = () => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#fbfbf9'; ctx.fillRect(0, 0, W, H);
    const cw = CELL_W * cam.z; const ch = CELL_H * cam.z;
    const big = ch > 120;
    const [wx0, wy0] = toWorld(-cw, -ch); const [wx1, wy1] = toWorld(W + cw, H + ch);
    ctx.imageSmoothingQuality = 'high';
    for (const it of items) {
      if (it.x < wx0 || it.x > wx1 || it.y < wy0 || it.y > wy1) continue;
      const [sx, sy] = toScreen(it.x, it.y);
      const dim = highlightFiche && it.f !== highlightFiche;
      ctx.globalAlpha = dim ? 0.16 : it.a;
      const im = big ? getImg(it) : null;
      if (im) ctx.drawImage(im, it.s * PW, 0, PW, PH, sx, sy, cw, ch);
      else ctx.drawImage(atlas, (it.i % ACOLS) * CW, Math.floor(it.i / ACOLS) * CH, CW, CH, sx, sy, cw, ch);
    }
    ctx.globalAlpha = 1;
    if (hover) {
      const [sx, sy] = toScreen(hover.x, hover.y);
      ctx.strokeStyle = '#d3222a'; ctx.lineWidth = 2; ctx.strokeRect(sx - 3, sy - 3, cw + 6, ch + 6);
      const L = lang() === 'en' ? `Sheet ${hover.f}, no. ${hover.n}` : `Fiche ${hover.f}, n° ${hover.n}`;
      ctx.font = '500 12px "IBM Plex Mono", monospace';
      const tw = ctx.measureText(L).width + 14;
      const lx = Math.min(W - tw - 6, sx + cw + 8); const ly = Math.max(6, sy);
      ctx.fillStyle = '#17181a'; ctx.fillRect(lx, ly, tw, 24);
      ctx.fillStyle = '#ffffff'; ctx.fillText(L, lx + 7, ly + 16);
    }
  };

  const tick = () => {
    if (!visible) return;
    let moving = false;
    const k = calm ? 1 : 0.14;
    for (const key of ['x', 'y', 'z']) {
      const d = target[key] - cam[key];
      if (Math.abs(d) > (key === 'z' ? 0.0005 : 0.05)) { cam[key] += d * k; moving = true; } else cam[key] = target[key];
    }
    for (const it of items) {
      const dx = it.tx - it.x; const dy = it.ty - it.y;
      if (Math.abs(dx) > 0.3 || Math.abs(dy) > 0.3) { it.x += dx * (calm ? 1 : it.sp || 0.12); it.y += dy * (calm ? 1 : it.sp || 0.12); moving = true; } else { it.x = it.tx; it.y = it.ty; }
    }
    if (moving || dirty) { draw(); dirty = false; }
  };
  gsap.ticker.add(tick);
  ScrollTrigger.create({ trigger: sec, start: 'top bottom', end: 'bottom top', onToggle: (s) => { visible = s.isActive; dirty = true; } });

  // ouverture : les portraits arrivent en désordre, comme dans la salle 7
  shuffle(); placeAll(false);
  items.forEach((it) => { it.x = Math.random() * WORLD_W; it.y = WORLD_H + 400 + Math.random() * WORLD_H; it.sp = 0.05 + Math.random() * 0.08; it.a = 1; });
  cam.z = target.z = fitZoom(); cam.x = target.x = WORLD_W / 2; cam.y = target.y = WORLD_H / 2;
  if (calm) placeAll(true);
  const countEl = $('[data-wall-n]');
  const showCount = (v) => { countEl.textContent = SUO.fmt(Math.round(v)); };
  showCount(N); SUO.onLang(() => { showCount(N); dirty = true; });
  let started = calm;
  ScrollTrigger.create({ trigger: sec, start: 'top 75%', once: true, onEnter: () => {
    if (started) return; started = true;
    const o = { v: 0 }; gsap.to(o, { v: N, duration: 2.6, ease: 'power3.out', onUpdate: () => showCount(o.v) });
  } });
  if (!calm) items.forEach((it) => { it.x = it.tx; it.y = it.ty + WORLD_H + 300; });

  // interactions
  let drag = null; let moved = 0; const pointers = new Map(); let pinch = null;
  const hit = (sx, sy) => {
    const [wx, wy] = toWorld(sx, sy);
    const col = Math.floor(wx / (CELL_W + GAP)); const row = Math.floor(wy / (CELL_H + GAP));
    if (col < 0 || col >= COLS || row < 0) return null;
    const lx = wx - col * (CELL_W + GAP); const ly = wy - row * (CELL_H + GAP);
    if (lx > CELL_W || ly > CELL_H) return null;
    const k = row * COLS + col; if (k >= order.length) return null;
    return items[order[k]];
  };
  const local = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  cv.addEventListener('pointerdown', (e) => {
    cv.setPointerCapture(e.pointerId); pointers.set(e.pointerId, local(e));
    if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), z: target.z }; drag = null; return; }
    const [x, y] = local(e); drag = { x, y, cx: target.x, cy: target.y }; moved = 0;
  });
  cv.addEventListener('pointermove', (e) => {
    const p = local(e);
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, p);
    if (pinch && pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      target.z = pinch.z * Math.hypot(a[0] - b[0], a[1] - b[1]) / pinch.d; clampCam(); return;
    }
    if (drag) {
      const dx = p[0] - drag.x; const dy = p[1] - drag.y; moved = Math.max(moved, Math.hypot(dx, dy));
      target.x = drag.cx - dx / cam.z; target.y = drag.cy - dy / cam.z; clampCam();
      if (calm) { cam.x = target.x; cam.y = target.y; }
      dirty = true;
    } else if (e.pointerType === 'mouse') {
      const h = hit(p[0], p[1]); if (h !== hover) { hover = h; dirty = true; cv.style.cursor = h ? 'pointer' : 'grab'; }
    }
  });
  const end = (e) => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
    if (drag && moved < 6) { const p = local(e); const h = hit(p[0], p[1]); if (h) open(h); }
    drag = null;
  };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  cv.addEventListener('pointerleave', () => { hover = null; dirty = true; });
  cv.addEventListener('wheel', (e) => {
    if (!(e.ctrlKey || e.metaKey)) return; // la molette seule fait défiler la page
    e.preventDefault();
    const [sx, sy] = local(e); const [wx, wy] = toWorld(sx, sy);
    target.z *= Math.exp(-e.deltaY * 0.0022); clampCam();
    target.x = wx - (sx - W / 2) / target.z; target.y = wy - (sy - H / 2) / target.z; clampCam();
  }, { passive: false });
  cv.addEventListener('keydown', (e) => {
    const step = 120 / target.z;
    if (e.key === 'ArrowLeft') target.x -= step; else if (e.key === 'ArrowRight') target.x += step;
    else if (e.key === 'ArrowUp') target.y -= step; else if (e.key === 'ArrowDown') target.y += step;
    else if (e.key === '+' || e.key === '=') target.z *= 1.4; else if (e.key === '-') target.z /= 1.4;
    else if (e.key === 'Enter') { const h = hit(W / 2, H / 2); if (h) open(h); }
    else return;
    e.preventDefault(); clampCam(); dirty = true;
  });

  $$('[data-wall-zoom]').forEach((b) => b.addEventListener('click', () => { target.z *= +b.dataset.wallZoom > 0 ? 1.6 : 1 / 1.6; clampCam(); }));
  $('[data-wall-fit]').addEventListener('click', () => { highlightFiche = 0; target.z = fitZoom(); target.x = WORLD_W / 2; target.y = WORLD_H / 2; dirty = true; });
  $('[data-wall-shuffle]').addEventListener('click', () => { highlightFiche = 0; shuffle(); items.forEach((it) => { it.sp = 0.04 + Math.random() * 0.1; }); placeAll(calm); dirty = true; });
  const byFiche = () => { order = items.map((it) => it.i); items.forEach((it) => { it.sp = 0.06 + Math.random() * 0.06; }); placeAll(calm); };
  $('[data-wall-order]').addEventListener('click', () => { highlightFiche = 0; byFiche(); dirty = true; });
  $('[data-wall-fiche]').addEventListener('change', (e) => {
    const f = +e.target.value; if (!f) return;
    byFiche(); highlightFiche = f;
    const ks = order.map((idx, k) => (items[idx].f === f ? k : -1)).filter((k) => k >= 0);
    const k0 = ks[0]; const k1 = ks[ks.length - 1];
    const x0 = (k0 % COLS) * (CELL_W + GAP); const x1 = (k1 % COLS) * (CELL_W + GAP) + CELL_W;
    const y0 = Math.floor(k0 / COLS) * (CELL_H + GAP); const y1 = Math.floor(k1 / COLS) * (CELL_H + GAP) + CELL_H;
    target.z = Math.min(1.1, Math.min(W / (Math.max(x1 - x0, CELL_W * 8) + 200), H / (y1 - y0 + 300)));
    target.x = (x0 + x1) / 2; target.y = (y0 + y1) / 2; clampCam(); dirty = true;
  });

  // grande vue : les portraits de la fiche sont découpés dans sa planche
  const proxy = document.createElement('div'); proxy.hidden = true; document.body.appendChild(proxy);
  const urls = new Map();
  async function cropUrl(o) {
    if (urls.has(o.i)) return urls.get(o.i);
    const img = await loadSheet(o.f).p; if (!img) return '';
    const c = document.createElement('canvas'); c.width = PW; c.height = PH;
    c.getContext('2d').drawImage(img, o.s * PW, 0, PW, PH, 0, 0, PW, PH);
    const u = await new Promise((r) => c.toBlob((b) => r(b ? URL.createObjectURL(b) : c.toDataURL('image/jpeg', 0.9)), 'image/webp', 0.92));
    urls.set(o.i, u); return u;
  }
  async function open(it) {
    const same = items.filter((o) => o.f === it.f).sort((a, b) => a.n - b.n);
    const srcs = await Promise.all(same.map(cropUrl));
    proxy.innerHTML = '';
    const els = same.map((o, k) => {
      const d = document.createElement('div');
      d.dataset.src = srcs[k];
      d.dataset.capFr = `Portrait d’une ville, fiche ${o.f}, n° ${o.n}`;
      d.dataset.capEn = `Portrait of a city, sheet ${o.f}, no. ${o.n}`;
      d.dataset.mail = `Portrait fiche ${o.f} n° ${o.n}`;
      proxy.appendChild(d); return d;
    });
    SUO.openLightbox(els[same.indexOf(it)], els);
  }
}
