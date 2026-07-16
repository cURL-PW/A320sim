// Primary Flight Display (SVG): FMA, attitude, speed/alt tapes, VS, ILS,
// callout text. Autoflight keeps bank at zero so the horizon only pitches.
import { vSpeeds } from './flight.js';

const NS = 'http://www.w3.org/2000/svg';
function el(tag, attrs = {}, parent) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (parent) parent.appendChild(e);
  return e;
}
function txt(parent, x, y, str, cls = 'w', anchor = 'middle') {
  const t = el('text', { x, y, class: cls, 'text-anchor': anchor }, parent);
  t.textContent = str;
  return t;
}

export function buildPfd(root) {
  const svg = el('svg', { viewBox: '0 0 500 460', class: 'ecam-screen pfd' });
  el('rect', { x: 0, y: 0, width: 500, height: 460, class: 'crt' }, svg);
  root.appendChild(svg);
  const main = el('g', {}, svg);

  // ---- FMA (top row) ----
  el('line', { x1: 10, y1: 52, x2: 490, y2: 52, class: 'sep' }, main);
  for (const x of [160, 265, 370]) el('line', { x1: x, y1: 8, x2: x, y2: 52, class: 'sep' }, main);
  const fmaThr = txt(main, 85, 32, '', 'g mid');
  const fmaVert = txt(main, 212, 32, '', 'g mid');
  const fmaLat = txt(main, 317, 32, '', 'g mid');
  const fmaAp = txt(main, 430, 20, '', 'w small');
  const fmaFd = txt(main, 430, 34, '', 'w small');
  const fmaAthr = txt(main, 430, 48, '', 'w small');

  // ---- attitude ----
  const attClip = el('clipPath', { id: 'attClip' }, svg);
  el('rect', { x: 150, y: 70, width: 200, height: 220 }, attClip);
  const attG = el('g', { 'clip-path': 'url(#attClip)' }, main);
  const sky = el('rect', { x: 100, y: -400, width: 300, height: 580, fill: '#2c5f9e' }, attG);
  const gnd = el('rect', { x: 100, y: 180, width: 300, height: 580, fill: '#7a5233' }, attG);
  const horizon = el('line', { x1: 100, y1: 180, x2: 400, y2: 180, stroke: '#fff', 'stroke-width': 2 }, attG);
  // pitch ladder (10° marks)
  const ladder = el('g', {}, attG);
  for (const p of [-20, -10, 10, 20]) {
    el('line', { x1: 220, y1: 180 - p * 4.4, x2: 280, y2: 180 - p * 4.4, stroke: '#fff', 'stroke-width': 1.5 }, ladder);
    txt(ladder, 208, 184 - p * 4.4, String(Math.abs(p)), 'w small', 'end');
  }
  // fixed aircraft symbol
  el('path', { d: 'M 190 180 h 40 v 10 h -8 v -4 h -32 Z', fill: '#ff0', stroke: '#000' }, main);
  el('path', { d: 'M 310 180 h -40 v 10 h 8 v -4 h 32 Z', fill: '#ff0', stroke: '#000' }, main);
  el('rect', { x: 247, y: 177, width: 6, height: 6, fill: '#ff0', stroke: '#000' }, main);
  const attFlag = txt(main, 250, 185, 'ATT', 'r mid');

  // ---- speed tape ----
  const spdClip = el('clipPath', { id: 'spdClip' }, svg);
  el('rect', { x: 20, y: 70, width: 90, height: 260 }, spdClip);
  el('rect', { x: 20, y: 70, width: 90, height: 260, class: 'tape' }, main);
  const spdG = el('g', { 'clip-path': 'url(#spdClip)' }, main);
  const spdTicks = el('g', {}, spdG);
  const PX_PER_KT = 3.4, SPD_C = 200;
  const spdEls = [];
  for (let v = 0; v <= 420; v += 10) {
    const g = el('g', {}, spdTicks);
    el('line', { x1: 92, y1: 0, x2: 108, y2: 0, stroke: '#cfd8e0', 'stroke-width': 1.5 }, g);
    if (v % 20 === 0) txt(g, 82, 5, String(v), 'w small', 'end');
    spdEls.push({ g, v });
  }
  const bugEls = {};
  for (const [key, label, cls] of [['v1', '1', 'c-b'], ['vr', 'R', 'c-b'], ['v2', '2', 'c-b']]) {
    bugEls[key] = txt(spdG, 116, 0, label, 'bug small', 'start');
  }
  el('rect', { x: 20, y: SPD_C - 14, width: 90, height: 28, class: 'valwin' }, main);
  const spdVal = txt(main, 88, SPD_C + 7, '0', 'g big', 'end');

  // ---- altitude tape ----
  const altClip = el('clipPath', { id: 'altClip' }, svg);
  el('rect', { x: 390, y: 70, width: 80, height: 260 }, altClip);
  el('rect', { x: 390, y: 70, width: 80, height: 260, class: 'tape' }, main);
  const altG = el('g', { 'clip-path': 'url(#altClip)' }, main);
  const altTicks = el('g', {}, altG);
  const PX_PER_FT = 0.5;
  const altEls = [];
  for (let v = 0; v <= 26000; v += 100) {
    const g = el('g', {}, altTicks);
    el('line', { x1: 390, y1: 0, x2: 402, y2: 0, stroke: '#cfd8e0', 'stroke-width': 1.5 }, g);
    if (v % 500 === 0) txt(g, 408, 5, String(v), 'w small', 'start');
    altEls.push({ g, v });
  }
  el('rect', { x: 390, y: SPD_C - 14, width: 80, height: 28, class: 'valwin' }, main);
  const altVal = txt(main, 400, SPD_C + 7, '0', 'g big', 'start');
  const vsVal = txt(main, 430, 350, '', 'g');

  // ---- ILS deviation ----
  const ilsG = el('g', {}, main);
  const locScale = el('g', {}, ilsG);
  el('line', { x1: 170, y1: 315, x2: 330, y2: 315, class: 'sep' }, locScale);
  for (const x of [190, 220, 280, 310]) el('circle', { cx: x, cy: 315, r: 3, class: 'ilsdot' }, locScale);
  const locDia = el('path', { d: 'M 250 307 l 8 8 l -8 8 l -8 -8 Z', class: 'ils-dia' }, ilsG);
  const gsScale = el('g', {}, ilsG);
  el('line', { x1: 372, y1: 100, x2: 372, y2: 260, class: 'sep' }, gsScale);
  for (const y of [120, 150, 210, 240]) el('circle', { cx: 372, cy: y, r: 3, class: 'ilsdot' }, gsScale);
  const gsDia = el('path', { d: 'M 364 180 l 8 -8 l 8 8 l -8 8 Z', class: 'ils-dia' }, ilsG);

  // ---- lower info + callout ----
  const hdgTxt = txt(main, 250, 350, '', 'g');
  const calloutTxt = txt(main, 250, 420, '', 'w callout');

  return {
    update(s, d) {
      main.style.display = d.screensOn && !d.booting ? '' : 'none';
      if (!d.screensOn || d.booting) return;
      const f = s.flight;
      const aligned = s.adirs.some(a => a.aligned);

      // FMA
      fmaThr.textContent = f.fma.thr;
      fmaThr.setAttribute('class', (f.fma.lvrClb ? 'w flash mid' : 'g mid'));
      fmaVert.textContent = f.fma.vert;
      fmaLat.textContent = f.fma.lat;
      fmaAp.textContent = f.ap1 ? 'AP1' : '';
      fmaFd.textContent = '1FD2';
      fmaAthr.textContent = d.anyEngRun ? 'A/THR' : '';

      // attitude
      const off = f.pitch * 4.4;
      sky.setAttribute('y', -400 + off);
      gnd.setAttribute('y', 180 + off);
      horizon.setAttribute('y1', 180 + off);
      horizon.setAttribute('y2', 180 + off);
      ladder.setAttribute('transform', `translate(0 ${off})`);
      const showAtt = aligned;
      for (const e of [sky, gnd, horizon, ladder]) e.style.display = showAtt ? '' : 'none';
      attFlag.style.display = showAtt ? 'none' : '';

      // speed tape
      for (const { g, v } of spdEls) {
        const y = SPD_C + (f.ias - v) * PX_PER_KT;
        g.setAttribute('transform', `translate(0 ${y})`);
        g.style.display = y > 60 && y < 340 ? '' : 'none';
      }
      const vs = vSpeeds(s);
      for (const key of ['v1', 'vr', 'v2']) {
        const y = SPD_C + (f.ias - vs[key]) * PX_PER_KT + 4;
        bugEls[key].setAttribute('y', y);
        bugEls[key].style.display = y > 70 && y < 330 && !f.airborne ? '' : 'none';
      }
      spdVal.textContent = String(Math.round(f.ias));

      // altitude tape
      for (const { g, v } of altEls) {
        const y = SPD_C + (f.alt - v) * PX_PER_FT;
        g.setAttribute('transform', `translate(0 ${y})`);
        g.style.display = y > 60 && y < 340 ? '' : 'none';
      }
      altVal.textContent = String(Math.round(f.alt / 10) * 10);
      vsVal.textContent = Math.abs(f.vs) > 60 ? String(Math.round(f.vs / 100) * 100) : '';

      // ILS
      const showIls = f.appr;
      ilsG.style.display = showIls ? '' : 'none';
      if (showIls) {
        locDia.style.display = f.loc ? '' : 'none';
        gsDia.style.display = f.gs_cap ? '' : 'none';
      }

      hdgTxt.textContent = aligned ? `HDG ${String(Math.round(f.hdg) % 360).padStart(3, '0')}` : '';
      calloutTxt.textContent = f.calloutT > 0 ? f.lastCallout.toUpperCase() : '';
    },
  };
}
