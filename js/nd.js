// Simple north-up Navigation Display: route line, waypoints, aircraft symbol,
// TO-waypoint readout. Also hosts the phase-dependent action buttons
// (LINE UP / TIME SKIP / VACATE).
import { getScenario, routePoint, routeDistances, totalDistance } from './navdata.js';
import { canLineUp, lineUp, timeWarp, warpTarget, canVacate, vacate, todPos } from './flight.js';

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

export function buildNd(root, act) {
  const svg = el('svg', { viewBox: '0 0 500 460', class: 'ecam-screen nd' });
  el('rect', { x: 0, y: 0, width: 500, height: 460, class: 'crt' }, svg);
  root.appendChild(svg);
  const main = el('g', {}, svg);

  // world -> screen transform for the active scenario
  let sc = null, toXY = null, routeG = null, todMark = null;
  const acft = el('path', {
    d: 'M 0 -12 L 8 8 L 0 3 L -8 8 Z', class: 'acft',
  }, main);
  const gsTxt = txt(main, 20, 28, '', 'g', 'start');
  txt(main, 20, 46, 'GS', 'w small', 'start');
  const toTxt = txt(main, 480, 28, '', 'g', 'end');
  const distTxt = txt(main, 480, 46, '', 'c-col small', 'end');
  const phaseTxt = txt(main, 250, 446, '', 'w small');

  function buildRoute(s) {
    sc = getScenario(s);
    if (routeG) routeG.remove();
    routeG = el('g', {}, main);
    main.insertBefore(routeG, acft);
    const xs = sc.route.map(w => w.x), ys = sc.route.map(w => w.y);
    const minX = Math.min(...xs) - 15, maxX = Math.max(...xs) + 15;
    const minY = Math.min(...ys) - 15, maxY = Math.max(...ys) + 15;
    const scale = Math.min(460 / (maxX - minX), 360 / (maxY - minY));
    toXY = (x, y) => [30 + (x - minX) * scale, 420 - (y - minY) * scale];
    let dpath = '';
    for (const w of sc.route) {
      const [px, py] = toXY(w.x, w.y);
      dpath += (dpath ? ' L ' : 'M ') + px.toFixed(1) + ' ' + py.toFixed(1);
    }
    el('path', { d: dpath, class: 'route' }, routeG);
    for (const w of sc.route) {
      const [px, py] = toXY(w.x, w.y);
      if (w.kind === 'rwy') {
        el('rect', { x: px - 4, y: py - 4, width: 8, height: 8, class: 'wpt-rwy' }, routeG);
      } else {
        el('path', { d: `M ${px} ${py - 5} L ${px + 5} ${py} L ${px} ${py + 5} L ${px - 5} ${py} Z`, class: 'wpt' }, routeG);
      }
      txt(routeG, px + 8, py - 6, w.id, 'w tiny', 'start');
    }
    todMark = txt(routeG, 0, 0, 'T/D', 'c-col tiny');
  }

  // action buttons (HTML overlay)
  const btnRow = document.createElement('div');
  btnRow.className = 'nd-btns';
  root.appendChild(btnRow);
  const mkBtn = (label, onClick) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.addEventListener('click', onClick);
    btnRow.appendChild(b);
    return b;
  };
  const lineupBtn = mkBtn('LINE UP', () => act.do(s => { if (canLineUp(s)) lineUp(s); }));
  const skipBtn = mkBtn('TIME SKIP', () => act.do(s => timeWarp(s)));
  const vacateBtn = mkBtn('VACATE RWY', () => act.do(s => { if (canVacate(s)) vacate(s); }));
  lineupBtn.dataset.help = '@lineup'; lineupBtn.dataset.helpTitle = 'LINE UP';
  skipBtn.dataset.help = '@warp'; skipBtn.dataset.helpTitle = 'TIME SKIP';
  vacateBtn.dataset.help = '@vacate'; vacateBtn.dataset.helpTitle = 'VACATE RWY';
  const WARP_LABEL = { TOC: 'TIME SKIP → T/C', TOD: 'TIME SKIP → T/D', APPR: 'TIME SKIP → APPR' };

  return {
    update(s, d) {
      main.style.display = d.screensOn && !d.booting ? '' : 'none';
      if (d.screensOn && !d.booting) {
        if (!sc || sc.id !== s.gnd.scenario) buildRoute(s);
        const f = s.flight;
        const total = totalDistance(sc);
        const rp = routePoint(sc, Math.min(f.pos, total));
        const [ax, ay] = toXY(rp.x, rp.y);
        acft.setAttribute('transform', `translate(${ax.toFixed(1)} ${ay.toFixed(1)}) rotate(${f.hdg.toFixed(0)})`);
        const tp = routePoint(sc, todPos(s));
        const [tx, ty] = toXY(tp.x, tp.y);
        todMark.setAttribute('x', tx + 8);
        todMark.setAttribute('y', ty + 12);
        gsTxt.textContent = String(Math.round(f.gs));
        toTxt.textContent = rp.toId;
        distTxt.textContent = f.pos > 0 || f.phase !== 'ground'
          ? `${rp.toDist.toFixed(1)} NM` : `DIST ${Math.round(total)} NM`;
        phaseTxt.textContent = f.phase.toUpperCase();
      }
      lineupBtn.style.display = canLineUp(s) ? '' : 'none';
      const wt = warpTarget(s);
      skipBtn.style.display = wt ? '' : 'none';
      if (wt) skipBtn.textContent = WARP_LABEL[wt];
      vacateBtn.style.display = canVacate(s) ? '' : 'none';
    },
  };
}
