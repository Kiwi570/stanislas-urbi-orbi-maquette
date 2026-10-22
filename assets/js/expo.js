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
    const tl = gsap.timeline({ delay: 0.15, defaults: { ease: 'expo.out' } });
    const h1 = $('#ex-title');
    const words = [];
    $$('[data-l]', h1).forEach((sp) => { const s = new SplitText(sp, { type: 'lines,words', linesClass: 'split-line' }); words.push(...s.words); });
    tl.from('[data-ex-poster]', { yPercent: -60, rotate: -6, opacity: 0, duration: 1.6 })
      .from(words, { yPercent: 118, duration: 1.2, stagger: 0.06 }, 0.2)
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
  let gotoPanel = (n) => SUO.scrollTo(panels[n - 1]);

  mm.add({ desk: '(min-width: 901px)', mob: '(max-width: 900px)' }, (ctx) => {
    if (ctx.conditions.desk && !calm) {
      const dist = () => track.scrollWidth - window.innerWidth;
      const st = { trigger: pin, start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 0.7, invalidateOnRefresh: true,
        snap: { snapTo: 1 / (panels.length - 1), duration: { min: 0.25, max: 0.7 }, delay: 0.08, ease: 'power2.inOut' },
        onUpdate: (s) => {
          const f = s.progress * (panels.length - 1); const i = Math.round(f);
          setRoom(i + 1);
          const a = Math.floor(f); const b = Math.min(panels.length - 1, a + 1); const t = f - a;
          const ca = gsap.utils.interpolate(mix(tintOf(panels[a]), 0.14), mix(tintOf(panels[b]), 0.14), t);
          pin.style.backgroundColor = ca;
        } };
      const tween = gsap.to(track, { x: () => -dist(), ease: 'none', scrollTrigger: st });
      panels.forEach((p, i) => {
        const st2 = i === 0 ? { trigger: pin, start: 'top 70%', toggleActions: 'play none none none' } : { trigger: p, containerAnimation: tween, start: 'left 70%', toggleActions: 'play none none reverse' };
        gsap.from($$('.work', p), { y: 80, opacity: 0, rotate: 1.5, stagger: 0.08, duration: 1, ease: 'expo.out', scrollTrigger: st2 });
        gsap.from($('.room-no', p), { yPercent: 60, opacity: 0, duration: 1, ease: 'expo.out', scrollTrigger: { ...st2 } });
      });
      gotoPanel = (n) => {
        const s = tween.scrollTrigger;
        SUO.scrollTo(s.start + (s.end - s.start) * ((n - 1) / (panels.length - 1)));
      };
    } else {
      panels.forEach((p, i) => ScrollTrigger.create({ trigger: p, start: 'top 55%', end: 'bottom 55%', onToggle: (s) => { if (s.isActive) { setRoom(i + 1); p.style.backgroundColor = mix(tintOf(p), 0.12); } } }));
      if (!calm) panels.forEach((p) => gsap.from($$('.work', p), { y: 60, opacity: 0, stagger: 0.08, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: p, start: 'top 75%', once: true } }));
      gotoPanel = (n) => SUO.scrollTo(panels[n - 1]);
    }
  });
  setRoom(1);
  $$('[data-goto]').forEach((b) => b.addEventListener('click', () => gotoPanel(+b.dataset.goto)));
  document.addEventListener('suo:goto', (e) => {
    const m = /^salle-(\d)$/.exec(e.detail.id || '');
    if (!m) return;
    e.preventDefault();
    setTimeout(() => gotoPanel(+m[1]), e.detail.instant ? 120 : 0);
  });
  $$('[data-proom]').forEach((g) => { g.style.cursor = 'pointer'; g.addEventListener('click', () => gotoPanel(+g.dataset.proom)); });

  /* montage */
  if (!calm) gsap.from('.makingof figure', { y: 70, opacity: 0, stagger: 0.1, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: '.makingof', start: 'top 85%', once: true } });
}
