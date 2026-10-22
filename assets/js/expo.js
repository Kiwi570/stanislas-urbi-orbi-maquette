/* Page Exposition 2005 : affiche, plan, visite horizontale salle par salle */
export default function expo(SUO) {
  const { gsap, ScrollTrigger, $, $$, isCalm } = SUO;
  const calm = isCalm();
  const mm = gsap.matchMedia();

  const mix = (hex, amt) => {
    const n = parseInt(hex.slice(1), 16); const r = (n >> 16) & 255; const g = (n >> 8) & 255; const b = n & 255;
    const P = [236, 235, 229];
    return `rgb(${Math.round(P[0] + (r - P[0]) * amt)}, ${Math.round(P[1] + (g - P[1]) * amt)}, ${Math.round(P[2] + (b - P[2]) * amt)})`;
  };

  /* héros */
  if (!calm) {
    const sp = SUO.splitWords($('#ex-title'));
    const tl = gsap.timeline({ delay: 0.15, defaults: { ease: 'expo.out' }, onComplete: () => sp.revert() });
    const words = sp.words;
    tl.from('[data-ex-poster]', { yPercent: -60, rotate: -6, opacity: 0, duration: 1.6 })
      .from(words, { yPercent: 130, duration: 1.2, stagger: 0.06 }, 0.2)
      .from('.ex-hero .lede', { y: 20, opacity: 0, duration: 1 }, 0.6)
      .from('.stamp', { scale: 2.2, rotate: -60, opacity: 0, duration: 0.9, ease: 'back.out(1.6)' }, 0.9);
    gsap.to('[data-ex-poster]', { yPercent: 40, ease: 'none', scrollTrigger: { trigger: '.ex-hero', start: 'top top', end: 'bottom top', scrub: true } });
  }

  /* plan */
  const walk = $('[data-plan] .walk');
  if (walk) {
    const L = walk.getTotalLength(); walk.style.strokeDasharray = L;
    if (calm) walk.style.strokeDashoffset = 0;
    else gsap.fromTo(walk, { strokeDashoffset: L }, { strokeDashoffset: 0, ease: 'none', scrollTrigger: { trigger: '[data-plan]', start: 'top 80%', end: 'bottom 50%', scrub: 0.6 } });
    if (!calm) gsap.from('[data-proom]', { opacity: 0, y: 20, stagger: 0.06, duration: 0.8, ease: 'expo.out', scrollTrigger: { trigger: '[data-plan]', start: 'top 80%', once: true } });
  }
  const setRoom = (n) => {
    $$('[data-proom] .room').forEach((r) => r.classList.toggle('is-active', r.parentNode.dataset.proom === String(n)));
    $$('[data-goto]').forEach((b) => b.classList.toggle('is-on', b.dataset.goto === String(n)));
  };

  /* visite */
  const pin = $('[data-visit-pin]'); const track = $('[data-visit-track]');
  const panels = $$('[data-panel]');
  const tintOf = (p) => { const m = $('[data-tint]', p); return m ? m.dataset.tint : '#ecebe5'; };
  let gotoPanel = (n, now) => SUO.scrollTo(panels[n - 1], now ? { immediate: true, force: true } : {});

  mm.add({ desk: '(min-width: 901px)', mob: '(max-width: 900px)' }, (ctx) => {
    if (ctx.conditions.desk && !calm) {
      const dist = () => track.scrollWidth - window.innerWidth;
      // les salles n’ont pas toutes la même largeur : repères calculés sur leur position réelle
      const stops = () => { const d = Math.max(1, dist()); const x0 = panels[0].offsetLeft; return panels.map((p) => Math.min(1, Math.max(0, (p.offsetLeft - x0) / d))); };
      let P = stops();
      const roomAt = (prog) => { let a = 0; for (let i = 0; i < P.length; i++) if (P[i] <= prog + 1e-4) a = i; const b = Math.min(P.length - 1, a + 1); const t = b === a ? 0 : Math.max(0, Math.min(1, (prog - P[a]) / ((P[b] - P[a]) || 1))); return { a, b, t }; };
      const st = { trigger: pin, start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 0.7, invalidateOnRefresh: true,
        onRefresh: () => { P = stops(); },
        snap: { snapTo: (v) => P.reduce((best, x) => (Math.abs(x - v) < Math.abs(best - v) ? x : best), P[0]), inertia: false, duration: { min: 0.25, max: 0.7 }, delay: 0.08, ease: 'power2.inOut' },
        onUpdate: (s) => {
          const { a, b, t } = roomAt(s.progress);
          setRoom((t > 0.5 ? b : a) + 1);
          pin.style.backgroundColor = gsap.utils.interpolate(mix(tintOf(panels[a]), 0.14), mix(tintOf(panels[b]), 0.14), t);
        } };
      const tween = gsap.to(track, { x: () => -dist(), ease: 'none', scrollTrigger: st });
      panels.forEach((p, i) => {
        const st2 = i === 0 ? { trigger: pin, start: 'top 70%', toggleActions: 'play none none none' } : { trigger: p, containerAnimation: tween, start: 'left 70%', toggleActions: 'play none none reverse' };
        gsap.from($$('.work, .viewpoint', p), { y: 80, opacity: 0, rotate: 1.5, stagger: 0.08, duration: 1, ease: 'expo.out', scrollTrigger: st2 });
        gsap.from($('.room-no', p), { yPercent: 60, opacity: 0, duration: 1, ease: 'expo.out', scrollTrigger: { ...st2 } });
      });
      gotoPanel = (n, now) => {
        const s = tween.scrollTrigger;
        P = stops();
        SUO.scrollTo(s.start + (s.end - s.start) * P[n - 1], now ? { immediate: true, force: true } : {});
      };
    } else {
      panels.forEach((p, i) => ScrollTrigger.create({ trigger: p, start: 'top 55%', end: 'bottom 55%', onToggle: (s) => { if (s.isActive) { setRoom(i + 1); p.style.backgroundColor = mix(tintOf(p), 0.12); } } }));
      if (!calm) panels.forEach((p) => gsap.from($$('.work, .viewpoint', p), { y: 60, opacity: 0, stagger: 0.08, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: p, start: 'top 75%', once: true } }));
      gotoPanel = (n, now) => SUO.scrollTo(panels[n - 1], now ? { immediate: true, force: true } : {});
    }
  });
  setRoom(1);
  $$('[data-goto]').forEach((b) => b.addEventListener('click', () => gotoPanel(+b.dataset.goto)));
  document.addEventListener('suo:goto', (e) => {
    const m = /^salle-(\d)$/.exec(e.detail.id || '');
    if (!m) return;
    e.preventDefault();
    setTimeout(() => gotoPanel(+m[1], !!e.detail.instant), e.detail.instant ? 120 : 0);
  });
  $$('[data-proom]').forEach((g) => { g.style.cursor = 'pointer'; g.addEventListener('click', () => gotoPanel(+g.dataset.proom)); });

  /* salle 3 : trouver le point de vue de Georges Rousse */
  const vp = $('[data-viewpoint]');
  if (vp) {
    const layers = $$('.vp-layer', vp); const range = $('[data-vp-range]', vp); const cap = $('[data-vp-cap]', vp); const frame = $('.vp-frame', vp);
    const caps = [['Continents, dans la salle', 'Continents, in the room'], ['Continents, vue décentrée', 'Continents, off-axis view'], ['Continents, depuis le point de vue idéal', 'Continents, from the ideal viewpoint']];
    const srcs = layers.map((l) => $('img', l).getAttribute('src'));
    let cur = -1;
    const set = (v) => {
      const f = (v / 100) * (layers.length - 1);
      layers.forEach((l, i) => { l.style.opacity = i === 0 ? 1 : Math.max(0, Math.min(1, f - (i - 1))); });
      const i = Math.round(f);
      if (i !== cur) {
        cur = i;
        cap.querySelector('[data-l="fr"]').textContent = caps[i][0]; cap.querySelector('[data-l="en"]').textContent = caps[i][1];
        frame.dataset.src = srcs[i].replace(/-800\.webp$/, '.webp');
        frame.dataset.capFr = `${caps[i][0]}, Georges Rousse`; frame.dataset.capEn = `${caps[i][1]}, Georges Rousse`;
      }
      vp.classList.toggle('is-ideal', v >= 98);
    };
    range.addEventListener('input', () => set(+range.value));
    // glisser sur l’image revient à se déplacer dans la salle
    let dragX = null; let dragV = 0; let dragged = false;
    frame.addEventListener('pointerdown', (e) => { dragX = e.clientX; dragV = +range.value; dragged = false; });
    window.addEventListener('pointermove', (e) => {
      if (dragX === null) return;
      const dx = e.clientX - dragX; if (Math.abs(dx) > 6) dragged = true;
      if (dragged) { range.value = Math.max(0, Math.min(100, dragV + (dx / frame.clientWidth) * 140)); set(+range.value); }
    });
    window.addEventListener('pointerup', () => { dragX = null; });
    frame.addEventListener('click', (e) => { if (dragged) { e.stopImmediatePropagation(); e.preventDefault(); dragged = false; } }, true);
    if (calm) { range.value = 100; set(100); } else set(0);
  }

  /* montage */
  if (!calm) gsap.from('.makingof figure', { y: 70, opacity: 0, stagger: 0.1, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: '.makingof', start: 'top 85%', once: true } });
}
