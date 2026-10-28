/* Accueil : héros, question, relevé, globe, aperçus, terres, livre, frise */
export default function home(SUO) {
  const { gsap, ScrollTrigger, $, $$, isCalm, fine } = SUO;
  const calm = isCalm();
  const mm = gsap.matchMedia();

  /* ---------- héros ---------- */
  const hero = $('.hero');
  const hand = $('[data-hand]');
  const tip = $('[data-tip]');
  const linePath = $('.hero-line path');
  const axis = $('[data-axis]');
  let lineProgress = calm ? 1 : 0;
  // « prolongée tout droit » : la ligne suit l’axe de l’index jusqu’au bord de l’écran
  function heroLine() {
    if (!hero || !tip || !axis) return;
    const hr = hero.getBoundingClientRect(); const tr = tip.getBoundingClientRect(); const ar = axis.getBoundingClientRect();
    const sx = tr.left + tr.width / 2 - hr.left; const sy = tr.top + tr.height / 2 - hr.top;
    let dx = (tr.left + tr.width / 2) - (ar.left + ar.width / 2); let dy = (tr.top + tr.height / 2) - (ar.top + ar.height / 2);
    if (dx > -1) { dx = -1; dy = 0; }
    const t = (-24 - sx) / dx; const ex = sx + dx * t; const ey = sy + dy * t;
    const x2 = sx + (ex - sx) * lineProgress; const y2 = sy + (ey - sy) * lineProgress;
    linePath.setAttribute('d', `M${sx.toFixed(1)} ${sy.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)}`);
  }
  const h1 = $('#hero-title');
  function heroIntro() {
    if (calm) { heroLine(); return; }
    const sp = SUO.splitWords(h1);
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' }, onComplete: () => sp.revert() });
    tl.from(sp.words, { yPercent: 130, rotate: 4, duration: 1.3, stagger: 0.06 })
      .from(hand, { xPercent: 40, rotate: 6, opacity: 0, duration: 1.6 }, 0.1)
      .from('.hero-sub > *', { y: 24, opacity: 0, duration: 1, stagger: 0.12 }, 0.6)
      .from('.hero-coords', { opacity: 0, duration: 0.8 }, 1.1)
      .from('.scroll-cue', { opacity: 0, y: 10, duration: 0.8 }, 1.2)
      .to({ p: 0 }, { p: 1, duration: 1.6, ease: 'power3.inOut', onUpdate() { lineProgress = this.targets()[0].p; heroLine(); } }, 0.9)
      .fromTo(tip, { scale: 0 }, { scale: 1, duration: 0.6, ease: 'back.out(3)' }, 0.8);
  }
  if (h1) { h1.classList.add('is-split'); }
  // le fil ne se redessine que pendant un mouvement (défilement, souris, redimensionnement)
  let activeUntil = 0;
  const wake = () => { activeUntil = performance.now() + 1500; };
  window.addEventListener('resize', () => { wake(); heroLine(); });
  if (!calm) {
    gsap.set(hand, { opacity: 1 });
    gsap.to(hand, { yPercent: 18, rotate: -3, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true, onUpdate: wake } });
    if (fine) {
      const hx = gsap.quickTo(hand, 'x', { duration: 1.2, ease: 'power3' });
      hero.addEventListener('pointermove', (e) => {
        const r = hero.getBoundingClientRect();
        const nx = (e.clientX - r.left) / r.width - 0.5; const ny = (e.clientY - r.top) / r.height - 0.5;
        hx(nx * -24); wake();
      });
    }
    const heroTick = () => { if (performance.now() < activeUntil) heroLine(); };
    gsap.ticker.add(heroTick);
    ScrollTrigger.create({ trigger: hero, start: 'top top', end: 'bottom top', onLeave: () => gsap.ticker.remove(heroTick), onEnterBack: () => { gsap.ticker.add(heroTick); wake(); } });
  }
  document.addEventListener('suo:intro', heroIntro, { once: true });
  heroLine();

  /* ---------- la question ---------- */
  const stage = $('[data-qstage]');
  if (stage) {
    const svg = $('.q-svg', stage); const aim = $('.aim', svg); const miss = $('.miss', svg); const target = $('.target', svg);
    const statueImg = $('.statue img', stage); const medal = $('.medal', stage); const medalImg = $('img', medal); const hereFig = $('.here', stage);
    const geo = () => {
      const sr = stage.getBoundingClientRect();
      svg.setAttribute('viewBox', `0 0 ${sr.width} ${sr.height}`);
      const ir = statueImg.getBoundingClientRect(); const mr = medalImg.getBoundingClientRect();
      const f = { x: ir.left - sr.left + ir.width * 0.185, y: ir.top - sr.top + ir.height * 0.185 };
      const m = { x: mr.left - sr.left + mr.width * 0.5, y: mr.top - sr.top + mr.height * 0.45 };
      aim.setAttribute('d', `M${f.x} ${f.y} L${m.x} ${m.y}`);
      target.setAttribute('cx', m.x); target.setAttribute('cy', m.y); target.setAttribute('r', Math.min(mr.width, mr.height) * 0.42);
      // la vraie direction passe au-dessus du médaillon et file hors champ, vers le nord-ouest
      const ang = Math.atan2(m.y - f.y, m.x - f.x) + 0.3;
      const topY = -stage.offsetTop + 96; const leftX = -stage.getBoundingClientRect().left + 8;
      const tY = (topY - f.y) / Math.sin(ang); const tX = (leftX - f.x) / Math.cos(ang);
      const L = Math.max(40, Math.min(tY > 0 ? tY : 1e5, tX > 0 ? tX : 1e5));
      const ex = f.x + Math.cos(ang) * L; const ey = f.y + Math.sin(ang) * L;
      miss.setAttribute('d', `M${f.x.toFixed(1)} ${f.y.toFixed(1)} L${ex.toFixed(1)} ${ey.toFixed(1)}`);
      const az = svg.querySelector('.miss-label');
      if (az) { az.setAttribute('x', ex + 10); az.setAttribute('y', ey + 18); }
      [aim, miss].forEach((p) => { const len = p.getTotalLength(); p.style.strokeDasharray = p === aim ? '6 7' : `${len}`; p.dataset.len = len; });
      const tl2 = target.getTotalLength ? target.getTotalLength() : 300; target.style.strokeDasharray = tl2; target.dataset.len = tl2;
    };
    geo();
    const steps = $$('[data-qstep]');
    mm.add({ desk: '(min-width: 901px)', mob: '(max-width: 900px)' }, (ctx) => {
      if (calm) {
        aim.style.opacity = 0.6; miss.style.strokeDashoffset = 0; target.style.strokeDashoffset = 0;
        return;
      }
      if (ctx.conditions.desk) {
        gsap.set(steps.slice(1), { autoAlpha: 0, y: 30 });
        gsap.set([medal, hereFig], { autoAlpha: 0, y: 40 });
        gsap.set(aim, { opacity: 0 }); gsap.set(miss, { strokeDashoffset: () => +miss.dataset.len });
        gsap.set(target, { strokeDashoffset: () => +target.dataset.len });
        const tl = gsap.timeline({ scrollTrigger: { trigger: '.q-pin', start: 'top top', end: '+=150%', pin: true, scrub: 0.6, onRefresh: geo, invalidateOnRefresh: true } });
        tl.from('.q-stage .statue', { y: 60, rotate: 2, duration: 1 })
          .to(steps[0], { autoAlpha: 0, y: -30, duration: 0.6 }, 1.2)
          .to(steps[1], { autoAlpha: 1, y: 0, duration: 0.6 }, 1.5)
          .to([hereFig, medal], { autoAlpha: 1, y: 0, stagger: 0.2, duration: 0.8 }, 1.3)
          .to(aim, { opacity: 1, duration: 0.4 }, 2)
          .fromTo(aim, { strokeDashoffset: 300 }, { strokeDashoffset: 0, duration: 1 }, 2)
          .to(target, { strokeDashoffset: 0, duration: 0.8 }, 2.4)
          .to(steps[1], { autoAlpha: 0, y: -30, duration: 0.6 }, 3.4)
          .to(steps[2], { autoAlpha: 1, y: 0, duration: 0.6 }, 3.7)
          .to(aim, { opacity: 0.15, duration: 0.5 }, 3.6)
          .to(target, { opacity: 0.25, duration: 0.5 }, 3.6)
          .to(medal, { autoAlpha: 0.35, duration: 0.5 }, 3.6)
          .to(miss, { strokeDashoffset: 0, duration: 1.4, ease: 'power2.inOut' }, 3.8)
          .fromTo('.miss-label', { opacity: 0 }, { opacity: 1, duration: 0.4 }, 5)
          .to({}, { duration: 0.6 });
      } else {
        gsap.from([medal, hereFig], { autoAlpha: 0, y: 30, stagger: 0.2, scrollTrigger: { trigger: stage, start: 'top 75%' } });
        gsap.set(aim, { opacity: 0.6 });
        gsap.fromTo(miss, { strokeDashoffset: () => +miss.dataset.len }, { strokeDashoffset: 0, scrollTrigger: { trigger: stage, start: 'top 60%', end: 'bottom 60%', scrub: true } });
        gsap.set(target, { strokeDashoffset: 0 });
      }
    });
    window.addEventListener('resize', () => { geo(); });
    gsap.from('.q-details figure', { y: 60, opacity: 0, stagger: 0.08, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: '.q-details', start: 'top 85%', once: true } });
  }

  /* ---------- le relevé ---------- */
  const compass = $('[data-compass]');
  if (compass) {
    const ticks = $('.ticks', compass);
    let s = '';
    for (let i = 0; i < 72; i++) {
      const a = (i * 5) * Math.PI / 180; const r1 = i % 18 === 0 ? 86 : (i % 2 ? 94 : 90);
      s += `<line x1="${(Math.sin(a) * r1).toFixed(2)}" y1="${(-Math.cos(a) * r1).toFixed(2)}" x2="${(Math.sin(a) * 100).toFixed(2)}" y2="${(-Math.cos(a) * 100).toFixed(2)}" stroke="currentColor" stroke-opacity="${i % 18 === 0 ? 0.8 : 0.3}"/>`;
    }
    ticks.innerHTML = s;
    const needle = $('.needle', compass); const arc = $('.arc', compass); const azEl = $('[data-az]', compass);
    const AZ = 325 + 45 / 60 + 46.04857 / 3600;
    const draw = (deg) => {
      needle.setAttribute('transform', `rotate(${deg})`);
      const r = 62; const a = deg * Math.PI / 180; const large = deg > 180 ? 1 : 0;
      arc.setAttribute('d', deg < 0.1 ? '' : `M0 ${-r} A${r} ${r} 0 ${large} 1 ${(Math.sin(a) * r).toFixed(2)} ${(-Math.cos(a) * r).toFixed(2)}`);
      const d = Math.floor(deg); const mf = (deg - d) * 60; const m = Math.floor(mf); const sec = Math.floor((mf - m) * 60);
      azEl.textContent = `${d}°${String(m).padStart(2, '0')}′${String(sec).padStart(2, '0')}″`;
    };
    if (calm) draw(AZ);
    else {
      const o = { d: 0 };
      draw(0);
      gsap.to(o, { d: AZ, ease: 'power2.inOut', onUpdate: () => draw(o.d), scrollTrigger: { trigger: compass, start: 'top 85%', end: 'bottom 35%', scrub: 0.8 } });
    }
  }
  const strip = $('[data-strip]');
  if (strip) {
    mm.add({ desk: '(min-width: 861px)' }, () => {
      if (calm) { $('[data-strip-scroller]').style.overflowX = 'auto'; return; }
      const dist = () => Math.max(0, strip.scrollWidth - window.innerWidth + 40);
      const tw = gsap.fromTo(strip, { x: 20 }, { x: () => -dist(), ease: 'none', scrollTrigger: { trigger: '.strip-wrap', start: 'center center', end: () => '+=' + Math.round(dist() * 0.6), pin: true, scrub: 0.5, invalidateOnRefresh: true } });
      // au clavier, la photo qui reçoit le focus est amenée à l’écran
      const onFocus = (e) => {
        const f = e.target.closest('.frame'); if (!f) return;
        const st = tw.scrollTrigger; const d = dist(); if (!d) return;
        const want = Math.max(0, Math.min(1, (f.offsetLeft + f.offsetWidth / 2 - window.innerWidth / 2 + 20) / d));
        SUO.scrollTo(st.start + (st.end - st.start) * want, { immediate: true });
      };
      strip.addEventListener('focusin', onFocus);
      return () => strip.removeEventListener('focusin', onFocus);
    });
  }

  /* ---------- le tour du monde ---------- */
  const globeCanvas = $('[data-globe]');
  if (globeCanvas) {
    let started = false;
    const start = () => {
      if (started) return; started = true;
      // les modules WebGL sont demandés en parallèle plutôt qu’en cascade
      ['core/Renderer', 'core/Camera', 'core/Transform', 'core/Program', 'core/Mesh', 'core/Texture', 'core/Geometry', 'extras/Sphere', 'extras/Polyline', 'math/Vec2', 'math/Vec3', 'math/Mat3', 'math/Mat4', 'math/Quat', 'math/Euler', 'math/Color', 'math/functions/Vec2Func', 'math/functions/Vec3Func', 'math/functions/Vec4Func', 'math/functions/Mat3Func', 'math/functions/Mat4Func', 'math/functions/QuatFunc', 'math/functions/EulerFunc', 'math/functions/ColorFunc'].forEach((p) => {
        const l = document.createElement('link'); l.rel = 'modulepreload'; l.href = `assets/vendor/ogl/${p}.js`; document.head.appendChild(l);
      });
      const pre = document.createElement('link'); pre.rel = 'preload'; pre.as = 'image'; pre.href = 'assets/data/land-2048.png'; document.head.appendChild(pre);
      import('./globe.js?v=20261028').then((m) => m.initGlobe(SUO)).then(() => ScrollTrigger.refresh()).catch((e) => console.warn('globe', e));
    };
    ScrollTrigger.create({ trigger: '[data-globe-track]', start: 'top bottom+=150%', end: 'bottom top', once: true, onEnter: start, onEnterBack: start });
  }

  /* ---------- la réponse ---------- */
  if ($('[data-answer]') && !calm) {
    gsap.from('.answer-map', { y: 80, rotate: 5, opacity: 0, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '[data-answer]', start: 'top 72%', once: true } });
    gsap.from('.answer .lede, .answer-cta', { y: 24, opacity: 0, duration: 1, stagger: 0.12, ease: 'expo.out', scrollTrigger: { trigger: '[data-answer]', start: 'top 65%', once: true } });
  }

  /* ---------- aperçu de l'exposition ---------- */
  const rooms = $('[data-rooms]');
  if (rooms) mm.add({ desk: '(min-width: 861px)' }, () => {
    if (calm) { $('[data-rooms-scroller]').style.overflowX = 'auto'; return; }
    const x0 = () => window.innerWidth * 0.12; const x1 = () => -(rooms.scrollWidth - window.innerWidth + 40);
    const tw = gsap.fromTo(rooms, { x: x0 }, { x: x1, ease: 'none', scrollTrigger: { trigger: '.expo-teaser', start: 'top bottom', end: 'bottom top', scrub: 0.6, invalidateOnRefresh: true } });
    rooms.addEventListener('focusin', (e) => {
      const c = e.target.closest('.room-card'); if (!c) return;
      const st = tw.scrollTrigger; const wantX = window.innerWidth / 2 - (c.offsetLeft + c.offsetWidth / 2);
      const p = Math.max(0, Math.min(1, (wantX - x0()) / (x1() - x0())));
      SUO.scrollTo(st.start + (st.end - st.start) * p, { immediate: true });
    });
    $$('.room-card', rooms).forEach((c, i) => gsap.from($('.room-img', c), { clipPath: 'inset(0 0 100% 0)', duration: 1.4, ease: 'expo.out', delay: i * 0.05, scrollTrigger: { trigger: '.expo-teaser', start: 'top 60%', once: true } }));
  });

  /* ---------- rangées de portraits ---------- */
  const ptc = $('[data-pt-rows]');
  if (ptc) ScrollTrigger.create({ trigger: ptc, start: 'top bottom+=120%', once: true, onEnter: () => {
    fetch('assets/portraits/portraits.json').then((r) => r.json()).then((data) => {
      const atlas = new Image(); atlas.decoding = 'async'; atlas.src = 'assets/portraits/atlas.webp';
      atlas.onload = () => portraitRows(ptc, atlas, data);
    }).catch(() => {});
  } });
  function portraitRows(cv, atlas, data) {
    const ctx = cv.getContext('2d');
    const [CW, CH] = data.cell; const cols = data.cols; const N = data.count;
    const rows = 4; const offs = [0, 0, 0, 0]; const speeds = [0.35, -0.5, 0.42, -0.3];
    const order = Array.from({ length: N }, (_, i) => i).sort(() => Math.random() - 0.5);
    let W = 0; let H = 0; let dpr = 1; let visible = false; let boost = 0;
    const resize = () => { dpr = Math.min(2, window.devicePixelRatio || 1); W = cv.clientWidth; H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr; };
    resize(); window.addEventListener('resize', resize);
    const frame = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const rh = H / rows; const ph = rh * 0.92; const pw = ph * (CW / CH); const gap = pw * 0.18;
      for (let r = 0; r < rows; r++) {
        if (!calm) offs[r] += speeds[r] * (1 + boost);
        const per = Math.ceil(W / (pw + gap)) + 2; const span = pw + gap;
        const base = ((offs[r] % span) + span) % span;
        const start = Math.floor(-offs[r] / span);
        for (let k = -1; k < per; k++) {
          const idx = order[(((start + k) * 7 + r * 131) % N + N) % N];
          const sx = (idx % cols) * CW; const sy = Math.floor(idx / cols) * CH;
          ctx.drawImage(atlas, sx, sy, CW, CH, k * span + base - span, r * rh + (rh - ph) / 2, pw, ph);
        }
      }
      boost *= 0.94;
    };
    frame();
    if (!calm) {
      ScrollTrigger.create({ trigger: cv, start: 'top bottom', end: 'bottom top', onToggle: (s) => { visible = s.isActive; }, onUpdate: (s) => { boost = Math.min(8, Math.abs(s.getVelocity()) / 300); } });
      gsap.ticker.add(() => { if (visible) frame(); });
    }
  }

  /* ---------- grains de terre ---------- */
  const gc = $('[data-grains]');
  if (gc && !calm) {
    const ctx = gc.getContext('2d'); const sec = $('.terres');
    const palette = ['#8b5a3c', '#a8705a', '#c39a6b', '#d9c7a4', '#6f6a62', '#b9946d', '#5a4636', '#cfb48a', '#9a3b2e'];
    let W = 0; let H = 0; let dpr = 1; let visible = false; let gather = 0; const mouse = { x: -1e4, y: -1e4 };
    const n = window.innerWidth < 700 ? 240 : 560;
    const P = Array.from({ length: n }, () => ({ x: Math.random(), y: Math.random(), vx: 0, vy: 0, r: 0.6 + Math.random() * 2.2, c: palette[(Math.random() * palette.length) | 0], a: Math.random() * Math.PI * 2, k: Math.random() }));
    const ring = { cx: 0, cy: 0, R: 100 };
    const measure = () => {
      const fig = $('.terres-grid figure'); const fr = fig.getBoundingClientRect(); const sr = sec.getBoundingClientRect();
      ring.cx = fr.left - sr.left + fr.width / 2; ring.cy = fr.top - sr.top + fr.height / 2; ring.R = Math.max(fr.width, fr.height) * 0.68;
    };
    const resize = () => { dpr = Math.min(1.5, window.devicePixelRatio || 1); W = sec.clientWidth; H = sec.clientHeight; gc.width = W * dpr; gc.height = H * dpr; measure(); };
    resize(); window.addEventListener('resize', resize); ScrollTrigger.addEventListener('refresh', resize);
    sec.addEventListener('pointermove', (e) => { const r = sec.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; });
    sec.addEventListener('pointerleave', () => { mouse.x = mouse.y = -1e4; });
    ScrollTrigger.create({ trigger: sec, start: 'top bottom', end: 'bottom top', onToggle: (s) => { visible = s.isActive; } });
    ScrollTrigger.create({ trigger: sec, start: 'top 70%', end: 'center center', scrub: true, onUpdate: (s) => { gather = s.progress; } });
    gsap.ticker.add(() => {
      if (!visible) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      const { cx, cy, R } = ring;
      for (const p of P) {
        const px = p.x * W; const py = p.y * H;
        p.a += 0.002 + p.k * 0.003;
        const tx = cx + Math.cos(p.a) * (R + p.k * 60); const ty = cy + Math.sin(p.a) * (R + p.k * 60);
        let ax = (tx - px) * 0.0025 * gather + Math.sin(p.a * 3 + p.k * 9) * 0.02;
        let ay = (ty - py) * 0.0025 * gather + 0.012 * (1 - gather);
        const dx = px - mouse.x; const dy = py - mouse.y; const d2 = dx * dx + dy * dy;
        if (d2 < 14000) { const f = (14000 - d2) / 14000 * 1.6; ax += dx / Math.sqrt(d2 + 1) * f; ay += dy / Math.sqrt(d2 + 1) * f; }
        p.vx = (p.vx + ax) * 0.92; p.vy = (p.vy + ay) * 0.92;
        let nx = px + p.vx; let ny = py + p.vy;
        if (ny > H + 5) ny = -5; if (nx < -5) nx = W + 5; if (nx > W + 5) nx = -5;
        p.x = nx / W; p.y = ny / H;
        ctx.fillStyle = p.c; ctx.globalAlpha = 0.85;
        ctx.beginPath(); ctx.ellipse(nx, ny, p.r, p.r * 0.75, p.a, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    });
  }

  /* ---------- le Livre sous la Place ---------- */
  const book = $('[data-book]');
  if (book) {
    const lsteps = $$('[data-lstep]'); const star = $('.paving .star'); const scene = $('[data-book-scene]'); const real = $('[data-book-real]');
    mm.add({ desk: '(min-width: 901px)', mob: '(max-width: 900px)' }, (ctx) => {
      if (calm) { gsap.set(book, { rotateY: -28 }); return; }
      if (ctx.conditions.desk) {
        gsap.set(lsteps.slice(1), { autoAlpha: 0, y: 30 });
        gsap.set(real, { autoAlpha: 0, y: 40, rotate: -2 });
        const drop = () => scene.clientHeight * 0.52;
        const tl = gsap.timeline({ scrollTrigger: { trigger: '.livre-pin', start: 'top top', end: '+=210%', pin: true, scrub: 0.8, invalidateOnRefresh: true } });
        tl.fromTo(book, { rotateY: -28, rotateX: -12, y: 0 }, { rotateY: 332, duration: 2, ease: 'none' })
          .to(lsteps[0], { autoAlpha: 0, y: -30, duration: 0.4 }, 1.8)
          .to(lsteps[1], { autoAlpha: 1, y: 0, duration: 0.4 }, 2.1)
          .to(book, { rotateX: -78, rotateY: 360, y: drop, scale: 0.42, duration: 1.4, ease: 'power2.in' }, 2.1)
          .to(book, { autoAlpha: 0, duration: 0.3 }, 3.4)
          .fromTo(star, { opacity: 0, yPercent: -140 }, { opacity: 1, yPercent: 0, duration: 0.9, ease: 'power3.out' }, 3.4)
          .to(real, { autoAlpha: 1, y: 0, rotate: 1.5, duration: 0.8, ease: 'power3.out' }, 4.0)
          .to('.paving', { opacity: 0.35, duration: 0.6 }, 4.0)
          .to(lsteps[1], { autoAlpha: 0, y: -30, duration: 0.4 }, 4.2)
          .to(lsteps[2], { autoAlpha: 1, y: 0, duration: 0.4 }, 4.5)
          .to({}, { duration: 0.5 });
      } else {
        gsap.to(book, { rotateY: 300, ease: 'none', scrollTrigger: { trigger: scene, start: 'top bottom', end: 'bottom top', scrub: true } });
      }
    });
    gsap.from('.livre-photos figure', { y: 80, opacity: 0, stagger: 0.07, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: '.livre-photos', start: 'top 85%', once: true } });
  }

  /* ---------- Daniel Denise ---------- */
  if (!calm) {
    gsap.from('.daniel .portrait', { clipPath: 'inset(100% 0 0 0)', duration: 1.6, ease: 'expo.out', scrollTrigger: { trigger: '.daniel', start: 'top 70%', once: true } });
    gsap.from('.t-item', { x: 80, opacity: 0, stagger: 0.07, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: '.timeline', start: 'top 85%', once: true } });
  }

  /* ---------- bandeau ciel ---------- */
  if (!calm && $('.sky-band')) {
    gsap.fromTo('.sky-band .ph', { yPercent: -7, scale: 1.08 }, { yPercent: 7, scale: 1, ease: 'none', scrollTrigger: { trigger: '.sky-band', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.from('.sky-band p', { y: 40, opacity: 0, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '.sky-band', start: 'top 60%', once: true } });
  }

  /* ---------- itinéraires (onglets) ---------- */
  const tabs = $$('[data-itin]');
  if (tabs.length) {
    const show = (n, focus) => {
      tabs.forEach((b) => { const on = b.dataset.itin === String(n); b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; if (on && focus) b.focus(); });
      $$('.itin-panel').forEach((p) => { p.hidden = p.id !== `itin-${n}`; });
      const panel = $(`#itin-${n}`);
      if (panel && !calm) gsap.from($$('li:not(.more)', panel), { x: -16, opacity: 0, stagger: 0.025, duration: 0.6, ease: 'expo.out' });
      if (panel) panel.scrollTop = 0;
    };
    tabs.forEach((b, i) => {
      b.addEventListener('click', () => show(b.dataset.itin));
      b.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        e.preventDefault();
        const d = (e.key === 'ArrowDown' || e.key === 'ArrowRight') ? 1 : -1;
        show(tabs[(i + d + tabs.length) % tabs.length].dataset.itin, true);
      });
    });
    // la liste complète s’ouvre dans la page, sans zone de défilement imbriquée
    $$('[data-itin-more]').forEach((btn) => btn.addEventListener('click', () => {
      const panel = btn.closest('.itin-panel'); const on = !panel.classList.contains('is-expanded');
      panel.classList.toggle('is-expanded', on); btn.setAttribute('aria-expanded', String(on));
      btn.hidden = on; ScrollTrigger.refresh();
      const first = $('li.more', panel); if (first && !calm) gsap.from($$('li.more', panel), { x: -16, opacity: 0, stagger: 0.02, duration: 0.6, ease: 'expo.out' });
    }));
    if (!calm) gsap.from('#itin-1 li:not(.more)', { x: -16, opacity: 0, stagger: 0.03, duration: 0.7, ease: 'expo.out', scrollTrigger: { trigger: '.itin-panels', start: 'top 75%', once: true } });
  }

  /* ---------- itinéraire ---------- */
  const route = $('[data-route-map] .route');
  if (route) {
    const L = route.getTotalLength(); route.style.strokeDasharray = L;
    if (calm) route.style.strokeDashoffset = 0;
    else {
      route.style.strokeDashoffset = L;
      gsap.to(route, { strokeDashoffset: 0, ease: 'none', scrollTrigger: { trigger: '[data-route-map]', start: 'top 80%', end: 'bottom 40%', scrub: 0.6 } });
      gsap.from('[data-route-map] .stop, [data-route-map] .lbl', { scale: 0, opacity: 0, transformOrigin: 'center', stagger: 0.08, scrollTrigger: { trigger: '[data-route-map]', start: 'top 60%', once: true } });
    }
  }
  if (!calm) {
    $$('.nancy-photos figure').forEach((f, i) => gsap.fromTo(f, { y: 40 + i * 30 }, { y: -20 - i * 10, ease: 'none', scrollTrigger: { trigger: '.nancy-photos', start: 'top bottom', end: 'bottom top', scrub: true } }));
    gsap.from('.releve-facts > div', { y: 40, opacity: 0, stagger: 0.12, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: '.releve-facts', start: 'top 85%', once: true } });
    gsap.fromTo('.terres .wide img', { clipPath: 'inset(0 50% 0 50%)' }, { clipPath: 'inset(0 0% 0 0%)', ease: 'none', scrollTrigger: { trigger: '.terres .wide', start: 'top 90%', end: 'center 55%', scrub: 0.6 } });
  }
}
