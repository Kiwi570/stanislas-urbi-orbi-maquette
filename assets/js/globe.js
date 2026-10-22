/* Globe WebGL (OGL) du tracé géodésique, avec carte SVG de repli */
import { Renderer } from '../vendor/ogl/core/Renderer.js';
import { Camera } from '../vendor/ogl/core/Camera.js';
import { Transform } from '../vendor/ogl/core/Transform.js';
import { Program } from '../vendor/ogl/core/Program.js';
import { Mesh } from '../vendor/ogl/core/Mesh.js';
import { Texture } from '../vendor/ogl/core/Texture.js';
import { Sphere } from '../vendor/ogl/extras/Sphere.js';
import { Polyline } from '../vendor/ogl/extras/Polyline.js';
import { Vec3 } from '../vendor/ogl/math/Vec3.js';
import { Color } from '../vendor/ogl/math/Color.js';

const D2R = Math.PI / 180;
const xyz = (lat, lon, r = 1) => {
  const a = lat * D2R; const b = lon * D2R;
  return [r * Math.cos(a) * Math.sin(b), r * Math.sin(a), r * Math.cos(a) * Math.cos(b)];
};

export async function initGlobe(SUO) {
  const { gsap, ScrollTrigger, $, $$, isCalm, lang } = SUO;
  const html = document.documentElement;
  const calm = isCalm();
  const data = await fetch('assets/data/geodesic.json').then((r) => r.json());
  const L = data.length_km;
  const path = data.path;
  const labels = data.labels;

  // longitudes « déroulées » pour une rotation continue
  const unwrapped = [];
  path.forEach((p, i) => {
    if (!i) { unwrapped.push(p[1]); return; }
    let d = p[1] - path[i - 1][1];
    if (d > 180) d -= 360; if (d < -180) d += 360;
    unwrapped.push(unwrapped[i - 1] + d);
  });
  const at = (km) => {
    let lo = 0; let hi = path.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (path[m][2] <= km) lo = m; else hi = m; }
    const a = path[lo]; const b = path[hi]; const t = Math.max(0, Math.min(1, (km - a[2]) / ((b[2] - a[2]) || 1)));
    return { lat: a[0] + (b[0] - a[0]) * t, lonU: unwrapped[lo] + (unwrapped[hi] - unwrapped[lo]) * t, lon: a[1] + (((b[1] - a[1] + 540) % 360) - 180) * t, i: lo + t };
  };

  // ---------- éléments d'interface ----------
  const stage = $('[data-globe-stage]'); const track = $('[data-globe-track]');
  const kmEl = $('[data-km]'); const placeEl = $('[data-place]'); const prog = $('[data-gprog]');
  const card = $('[data-map-card]'); const cardImg = $('[data-map-img]'); const cardCap = $('[data-map-cap]');
  const ms = $$('[data-ms]');
  const hud = $('.globe-hud');
  const labelEls = labels.map((l) => {
    const el = document.createElement('div'); el.className = 'g-label';
    el.innerHTML = `<span data-l="fr" lang="fr">${l.fr}</span><span data-l="en" lang="en">${l.en}</span>`;
    hud.appendChild(el); return el;
  });
  const head = document.createElement('div'); head.className = 'g-head'; hud.appendChild(head);

  let km = 0; let shownKm = 0; let lastLabel = -1; let lastCard = null;
  const last = { km: '', place: '', prog: -1, cardOn: null, ms: undefined };
  const setText = (el, key, v) => { if (last[key] !== v) { last[key] = v; el.textContent = v; } };
  const setHud = (k) => {
    setText(kmEl, 'km', k >= L - 0.6 ? SUO.fmt(L, 2) : SUO.fmt(Math.round(k)));
    const pr = Math.round((k / L) * 1000) / 1000;
    if (pr !== last.prog) { last.prog = pr; prog.style.transform = `scaleX(${pr})`; }
    let li = 0; for (let i = 0; i < labels.length; i++) if (labels[i].km <= k + 0.5) li = i;
    const l = labels[li];
    const inside = k <= l.to + 30 || li === 0;
    setText(placeEl, 'place', inside ? l[lang()] : (lang() === 'en' ? 'at sea' : 'en mer'));
    if (li !== lastLabel) { if (lastLabel >= 0 && li > lastLabel && SUO.sound) SUO.sound.ping(660 + li * 24); lastLabel = li; }
    // carte IGN du pays traversé
    let mapL = null;
    for (let i = li; i >= 0; i--) { if (labels[i].map) { if (k - labels[i].km < 4200) mapL = labels[i]; break; } }
    if (mapL && mapL.map !== lastCard) {
      lastCard = mapL.map;
      cardImg.src = `assets/img/cartes/${mapL.map}.webp`;
      cardImg.alt = lang() === 'en' ? `IGN map extract: ${mapL.en}` : `Extrait de carte IGN : ${mapL.fr}`;
      cardCap.textContent = (lang() === 'en' ? 'IGN map, 2004: ' : 'Carte IGN, 2004 : ') + mapL[lang()];
    }
    const cardOn = !!mapL && k > 60;
    if (cardOn !== last.cardOn) { last.cardOn = cardOn; card.classList.toggle('is-on', cardOn); }
    // jalons
    let on = null;
    ms.forEach((m) => { const mk = +m.dataset.ms; if (k >= mk - 40 && (k - mk < 3200 || mk >= 39998)) on = m; });
    if (on !== last.ms) { last.ms = on; ms.forEach((m) => m.classList.toggle('is-on', m === on)); }
  };
  SUO.onLang(() => { lastCard = null; last.km = last.place = ''; setHud(shownKm); });

  // ---------- WebGL ? ----------
  let renderer = null;
  if (!calm) {
    try {
      renderer = new Renderer({ canvas: $('[data-globe]'), dpr: Math.min(2, window.devicePixelRatio || 1), alpha: true, antialias: true });
      if (!renderer.gl) throw new Error('no gl');
    } catch (e) { renderer = null; }
  }
  if (!renderer) {
    html.classList.add('no-webgl');
    return fallback();
  }

  const gl = renderer.gl;
  gl.clearColor(0, 0, 0, 0);
  const camera = new Camera(gl, { fov: 32, near: 0.1, far: 50 });
  camera.position.set(0, 0, 4.4);
  const scene = new Transform();
  const tilt = new Transform(); tilt.setParent(scene);
  const spin = new Transform(); spin.setParent(tilt);

  const landImg = new Image(); landImg.src = 'assets/data/land-2048.png';
  await new Promise((res) => { landImg.onload = res; landImg.onerror = res; });
  const tLand = new Texture(gl, { image: landImg, generateMipmaps: false, minFilter: gl.LINEAR, flipY: true });

  const globeProg = new Program(gl, {
    vertex: /* glsl */ `
      attribute vec3 position; attribute vec3 normal;
      uniform mat4 modelViewMatrix; uniform mat4 projectionMatrix; uniform mat3 normalMatrix;
      varying vec3 vPos; varying vec3 vN;
      void main() { vPos = position; vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragment: /* glsl */ `
      precision highp float;
      uniform sampler2D tLand; uniform float uRows; uniform vec3 uOcean; uniform vec3 uLand; uniform vec3 uGrid; uniform vec3 uRim;
      varying vec3 vPos; varying vec3 vN;
      #define PI 3.14159265359
      void main() {
        vec3 p = normalize(vPos);
        float lat = asin(clamp(p.y, -1.0, 1.0));
        float lon = atan(p.x, p.z);
        float row = floor((lat + PI * 0.5) / PI * uRows);
        float latC = (row + 0.5) / uRows * PI - PI * 0.5;
        float n = max(1.0, floor(2.0 * uRows * cos(latC)));
        float col = floor((lon + PI) / (2.0 * PI) * n);
        float lonC = (col + 0.5) / n * 2.0 * PI - PI;
        float land = texture2D(tLand, vec2((lonC + PI) / (2.0 * PI), (latC + PI * 0.5) / PI)).r;
        vec2 d = vec2((lon - lonC) * cos(lat) * uRows / PI, (lat - latC) * uRows / PI);
        float dist = length(d);
        float dotMask = smoothstep(0.42, 0.30, dist) * smoothstep(0.35, 0.6, land);
        float step15 = PI / 12.0;
        float gLat = abs(fract(lat / step15 + 0.5) - 0.5) * step15;
        float gLon = abs(fract(lon / step15 + 0.5) - 0.5) * step15 * cos(lat);
        float g = max(smoothstep(0.0035, 0.0, gLat), smoothstep(0.0035, 0.0, gLon)) * 0.5;
        float fres = pow(1.0 - max(dot(normalize(vN), vec3(0.0, 0.0, 1.0)), 0.0), 2.2);
        vec3 c = uOcean + uGrid * g;
        c = mix(c, uLand, dotMask);
        c += uRim * fres * 0.55;
        gl_FragColor = vec4(c, 1.0);
      }`,
    uniforms: {
      tLand: { value: tLand }, uRows: { value: 150 },
      uOcean: { value: new Color('#151a21') }, uLand: { value: new Color('#c9ccd2') },
      uGrid: { value: new Color('#3b4452') }, uRim: { value: new Color('#5b7aa6') }
    }
  });
  const globe = new Mesh(gl, { geometry: new Sphere(gl, { radius: 1, widthSegments: 96, heightSegments: 64 }), program: globeProg });
  globe.setParent(spin);

  // halo atmosphérique
  const haloProg = new Program(gl, {
    vertex: /* glsl */ `
      attribute vec3 position; attribute vec3 normal;
      uniform mat4 modelViewMatrix; uniform mat4 projectionMatrix; uniform mat3 normalMatrix;
      varying vec3 vN;
      void main() { vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragment: /* glsl */ `
      precision highp float; varying vec3 vN;
      void main() { float i = pow(0.62 - dot(vN, vec3(0.0, 0.0, 1.0)), 3.0); gl_FragColor = vec4(0.36, 0.5, 0.78, 1.0) * i * 1.4; }`,
    transparent: true, cullFace: gl.FRONT, depthWrite: false
  });
  haloProg.setBlendFunc(gl.SRC_ALPHA, gl.ONE);
  const halo = new Mesh(gl, { geometry: new Sphere(gl, { radius: 1.16, widthSegments: 48, heightSegments: 32 }), program: haloProg });
  halo.setParent(scene);

  // la ligne
  const pts = path.map((p) => new Vec3(...xyz(p[0], p[1], 1.004)));
  const lineVert = /* glsl */ `
    precision highp float;
    attribute vec3 position; attribute vec3 next; attribute vec3 prev; attribute vec2 uv; attribute float side;
    uniform mat4 modelViewMatrix; uniform mat4 modelMatrix; uniform mat4 projectionMatrix;
    uniform vec2 uResolution; uniform float uDPR; uniform float uThickness;
    varying vec2 vUv; varying float vFront;
    vec4 getPosition() {
      mat4 mvp = projectionMatrix * modelViewMatrix;
      vec4 current = mvp * vec4(position, 1); vec4 nextPos = mvp * vec4(next, 1); vec4 prevPos = mvp * vec4(prev, 1);
      vec2 aspect = vec2(uResolution.x / uResolution.y, 1);
      vec2 cs = current.xy / current.w * aspect; vec2 ns = nextPos.xy / nextPos.w * aspect; vec2 ps = prevPos.xy / prevPos.w * aspect;
      vec2 dir1 = normalize(cs - ps + 1e-6); vec2 dir2 = normalize(ns - cs + 1e-6); vec2 dir = normalize(dir1 + dir2 + 1e-6);
      vec2 normal = vec2(-dir.y, dir.x); normal /= aspect;
      float pw = current.w * (1.0 / (uResolution.y / uDPR));
      normal *= pw * uThickness; current.xy -= normal * side; return current;
    }
    void main() { vUv = uv; vFront = (modelMatrix * vec4(position, 1.0)).z; gl_Position = getPosition(); }`;
  const lineFrag = /* glsl */ `
    precision highp float;
    uniform vec3 uColor; uniform float uProgress;
    varying vec2 vUv; varying float vFront;
    void main() {
      if (vUv.y > uProgress) discard;
      float front = smoothstep(-0.12, 0.08, vFront);
      gl_FragColor = vec4(uColor, mix(0.16, 1.0, front));
    }`;
  const line = new Polyline(gl, { points: pts, vertex: lineVert, fragment: lineFrag, uniforms: {
    uColor: { value: new Color('#e2262e') }, uThickness: { value: 3.2 }, uProgress: { value: 0 }
  } });
  line.mesh.program.transparent = true; line.mesh.program.depthTest = false;
  line.mesh.setParent(spin);

  // ---------- taille & position ----------
  let W = 1; let H = 1; let offX = 0.32;
  const resize = () => {
    W = stage.clientWidth; H = stage.clientHeight;
    renderer.setSize(W, H);
    camera.perspective({ aspect: W / H });
    const mobile = W < 860;
    offX = mobile ? 0 : 0.34;
    const fit = mobile ? 5.4 * Math.max(1, (H / W) * 0.55) : 4.25;
    camera.position.set(-offX, mobile ? 0.16 : 0, fit);
    line.resize();
  };
  resize();
  window.addEventListener('resize', resize);

  // ---------- défilement ----------
  let visible = false;
  ScrollTrigger.create({
    trigger: track, start: 'top top', end: 'bottom bottom',
    onUpdate: (s) => { const p = Math.max(0, Math.min(1, (s.progress - 0.03) / 0.94)); km = p * L; }
  });
  ScrollTrigger.create({ trigger: track, start: 'top bottom', end: 'bottom top', onToggle: (s) => { visible = s.isActive; } });

  const v = new Vec3(); const tmp = new Vec3();
  const h0 = at(0);
  let rotY = -h0.lonU * D2R - 0.55; let rotX = h0.lat * D2R * 0.62 + 0.12; let idle = 0;
  const project = (lat, lon) => {
    v.set(...xyz(lat, lon, 1.01));
    v.applyMatrix4(spin.worldMatrix);
    const front = v.z;
    tmp.copy(v).applyMatrix4(camera.viewMatrix).applyMatrix4(camera.projectionMatrix);
    return { x: (tmp.x * 0.5 + 0.5) * W, y: (-tmp.y * 0.5 + 0.5) * H, front };
  };

  const render = (time, dtMs) => {
    if (!visible) return;
    const dt = Math.min(0.1, (dtMs || 16) / 1000);
    const kKm = 1 - Math.exp(-dt * 7); const kRot = 1 - Math.exp(-dt * 6);
    shownKm += (km - shownKm) * kKm;
    if (Math.abs(km - shownKm) < 0.5) shownKm = km;
    idle += dt * 0.1;
    const h = at(shownKm);
    const targetY = -h.lonU * D2R - 0.55;
    const targetX = h.lat * D2R * 0.62 + 0.12;
    rotY += (targetY - rotY) * kRot; rotX += (targetX - rotX) * kRot;
    spin.rotation.y = rotY + Math.sin(idle) * 0.02;
    tilt.rotation.x = rotX;
    line.mesh.program.uniforms.uProgress.value = shownKm / L;
    scene.updateMatrixWorld();
    renderer.render({ scene, camera });
    // repères HTML
    const hp = project(h.lat, h.lon);
    head.style.transform = `translate(${hp.x}px, ${hp.y}px)`;
    head.style.opacity = hp.front > -0.05 ? 1 : 0.2;
    // étiquettes : de la plus récente à la plus ancienne, sans chevauchement
    const placed = [{ x: hp.x, y: hp.y }];
    for (let i = labels.length - 1; i >= 0; i--) {
      const l = labels[i];
      const pp = project(l.ll[0], l.ll[1]);
      let on = l.km <= shownKm + 1 && pp.front > 0.18 && (shownKm - l.km < 6000 || i === 0);
      if (on) on = !placed.some((q) => Math.abs(q.x - pp.x) < 86 && Math.abs(q.y - pp.y) < 22);
      if (on) placed.push({ x: pp.x, y: pp.y });
      const el = labelEls[i];
      if (on || el._on) el.style.transform = `translate(${pp.x.toFixed(1)}px, ${pp.y.toFixed(1)}px) translate(-50%, -50%)`;
      if (el._on !== on) { el._on = on; el.classList.toggle('is-on', on); }
    }
    setHud(shownKm);
  };
  gsap.ticker.add(render);
  visible = true; render(0, 1000); visible = false;
  setHud(0);
  // texte d'accessibilité


  // ---------- repli SVG ----------
  async function fallback() {
    const svg = $('[data-globe-fallback]');
    const landPath = await fetch('assets/data/land-110m.path.txt').then((r) => r.text()).catch(() => '');
    let grat = '';
    for (let x = 0; x <= 360; x += 30) grat += `<line x1="${x}" y1="0" x2="${x}" y2="180" stroke="rgba(255,255,255,.08)" stroke-width=".2"/>`;
    for (let y = 0; y <= 180; y += 30) grat += `<line x1="0" y1="${y}" x2="360" y2="${y}" stroke="rgba(255,255,255,.08)" stroke-width=".2"/>`;
    const segs = []; let cur = [];
    path.forEach((p, i) => {
      if (i && Math.abs(p[1] - path[i - 1][1]) > 180) { segs.push(cur); cur = []; }
      cur.push(`${(p[1] + 180).toFixed(2)} ${(90 - p[0]).toFixed(2)}`);
    });
    segs.push(cur);
    const lineD = segs.map((s) => 'M' + s.join(' L')).join(' ');
    svg.innerHTML = `${grat}<path d="${landPath}" fill="#2a3039"/><path class="fb-line" d="${lineD}" fill="none" stroke="#e2262e" stroke-width=".9" stroke-linejoin="round"/>
      ${labels.map((l) => `<g class="fb-lab" data-km="${l.km}"><circle cx="${(l.ll[1] + 180).toFixed(2)}" cy="${(90 - l.ll[0]).toFixed(2)}" r="1.1" fill="#e2262e"/><text x="${(l.ll[1] + 181.6).toFixed(2)}" y="${(90 - l.ll[0] - 1.4).toFixed(2)}" font-family="IBM Plex Mono" font-size="3.2" fill="#e9e7e0"><tspan data-l="fr">${l.fr}</tspan><tspan data-l="en">${l.en}</tspan></text></g>`).join('')}
      <circle class="fb-head" r="2" fill="#e2262e"/>`;
    const fl = $('.fb-line', svg); const len = fl.getTotalLength();
    const labs = $$('.fb-lab', svg); const fh = $('.fb-head', svg);
    const update = (k) => {
      // la longueur SVG n'est pas proportionnelle aux km : on s'appuie sur l'indice du point
      const h = at(k);
      fh.setAttribute('cx', (h.lon + 180).toFixed(2)); fh.setAttribute('cy', (90 - h.lat).toFixed(2));
      fl.style.strokeDasharray = `${len}`; fl.style.strokeDashoffset = `${len * (1 - h.i / (path.length - 1))}`;
      labs.forEach((g) => { g.style.opacity = +g.dataset.km <= k + 1 ? 1 : 0.15; });
      setHud(k);
    };
    if (calm) {
      track.style.height = 'auto';
      stage.style.position = 'relative';
      update(L);
      ms.forEach((m) => m.classList.remove('is-on'));
      return;
    }
    update(0);
    ScrollTrigger.create({ trigger: track, start: 'top top', end: 'bottom bottom', onUpdate: (s) => { const p = Math.max(0, Math.min(1, (s.progress - 0.03) / 0.94)); km = p * L; } });
    gsap.ticker.add(() => { if (Math.abs(km - shownKm) > 0.5) { shownKm += (km - shownKm) * 0.15; update(shownKm); } });
  }
}
