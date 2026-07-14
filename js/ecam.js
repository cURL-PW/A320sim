// ECAM displays rendered as SVG. Upper = E/WD, lower = SD with page switching.
import { sdAutoPage } from './sim.js';

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

// Screen-coordinate polar point (y down, angle in degrees, 0 = right, clockwise)
function pt(cx, cy, r, aDeg) {
  const a = aDeg * Math.PI / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

function arcPath(cx, cy, r, a0, a1) {
  const [x0, y0] = pt(cx, cy, r, a0);
  const [x1, y1] = pt(cx, cy, r, a1);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M ${x0.toFixed(1)} ${y0.toFixed(1)} A ${r} ${r} 0 ${large} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
}

// Round dial gauge (N1 / EGT / APU). Returns setter(value).
function gauge(parent, { cx, cy, r, max = 100, a0 = 150, a1 = 390, redFrom = null, decimals = 1 }) {
  const g = el('g', {}, parent);
  el('path', { d: arcPath(cx, cy, r, a0, a1), class: 'arc-w' }, g);
  if (redFrom != null) {
    el('path', { d: arcPath(cx, cy, r, a0 + (redFrom / max) * (a1 - a0), a1), class: 'arc-r' }, g);
  }
  const needle = el('line', { x1: cx, y1: cy, x2: cx, y2: cy, class: 'needle' }, g);
  const box = el('rect', { x: cx - 34, y: cy + r * 0.15, width: 68, height: 22, class: 'valbox' }, g);
  const val = txt(g, cx, cy + r * 0.15 + 17, '0.0', 'g big');
  return v => {
    const a = a0 + Math.min(1, Math.max(0, v / max)) * (a1 - a0);
    const [x2, y2] = pt(cx, cy, r - 4, a);
    needle.setAttribute('x2', x2.toFixed(1));
    needle.setAttribute('y2', y2.toFixed(1));
    val.textContent = v.toFixed(decimals);
    void box;
  };
}

function screenFrame(width = 600, height = 460) {
  const svg = el('svg', { viewBox: `0 0 ${width} ${height}`, class: 'ecam-screen' });
  el('rect', { x: 0, y: 0, width, height, class: 'crt' }, svg);
  const off = el('g', {}, svg);           // shown when unpowered (nothing)
  const boot = el('g', {}, svg);
  txt(boot, width / 2, height / 2, 'SELF TEST IN PROGRESS', 'g mid');
  txt(boot, width / 2, height / 2 + 28, '(MAX 40 SECONDS)', 'g mid');
  const main = el('g', {}, svg);
  return { svg, off, boot, main };
}

// ---------------------------------------------------------------- E/WD (upper)
export function buildEwd(root) {
  const { svg, boot, main } = screenFrame();
  root.appendChild(svg);

  const engX = [150, 450], C = 300;
  const setN1 = [], setEgt = [], n2Txt = [], ffTxt = [], ign = [];

  for (let i = 0; i < 2; i++) {
    const x = engX[i];
    setN1.push(gauge(main, { cx: x, cy: 95, r: 60, max: 104, redFrom: 100 }));
    setEgt.push(gauge(main, { cx: x, cy: 210, r: 45, max: 1000, redFrom: 950, decimals: 0 }));
    n2Txt.push(txt(main, x, 292, '', 'g big'));
    ffTxt.push(txt(main, x, 330, '', 'g big'));
    ign.push(txt(main, x, 30, '', 'grey'));
  }
  txt(main, C, 75, 'N1', 'w'); txt(main, C, 92, '%', 'c small');
  txt(main, C, 195, 'EGT', 'w'); txt(main, C, 212, '°C', 'c small');
  txt(main, C, 288, 'N2', 'w'); txt(main, C + 42, 288, '%', 'c small', 'start');
  txt(main, C, 326, 'FF', 'w'); txt(main, C + 42, 326, 'KG/H', 'c small', 'start');

  el('line', { x1: 10, y1: 352, x2: 590, y2: 352, class: 'sep' }, main);
  el('line', { x1: 300, y1: 352, x2: 300, y2: 452, class: 'sep' }, main);

  const fobLbl = txt(main, 20, 375, 'FOB :', 'w', 'start');
  const fobVal = txt(main, 85, 375, '', 'g', 'start');
  txt(main, 165, 375, 'KG', 'c small', 'start');
  void fobLbl;

  // left memo (takeoff/landing memo area) and right memo
  const leftMemo = [], rightMemo = [];
  for (let i = 0; i < 4; i++) leftMemo.push(txt(main, 20, 400 + i * 18, '', 'g', 'start'));
  for (let i = 0; i < 5; i++) rightMemo.push(txt(main, 315, 372 + i * 18, '', 'g', 'start'));

  return {
    update(s, d) {
      boot.style.display = d.booting ? '' : 'none';
      main.style.display = d.screensOn && !d.booting ? '' : 'none';
      if (!d.screensOn || d.booting) return;

      for (let i = 0; i < 2; i++) {
        const e = s.eng[i];
        setN1[i](e.n1);
        setEgt[i](e.egt);
        n2Txt[i].textContent = e.n2.toFixed(1);
        ffTxt[i].textContent = String(Math.round(e.ff / 10) * 10);
        ign[i].textContent = e.ignition ? 'IGN' : '';
        ign[i].setAttribute('class', 'w');
      }
      fobVal.textContent = String(Math.round(s.fob / 10) * 10);

      const rm = [];
      if (d.apuAvail) rm.push(['APU AVAIL', 'g']);
      if (s.apuBleed && d.apuAvail) rm.push(['APU BLEED', 'g']);
      if (s.parkBrk) rm.push(['PARK BRK', 'g']);
      if (s.signs.seatBelts) rm.push(['SEAT BELTS', 'g']);
      if (s.signs.noSmoking) rm.push(['NO SMOKING', 'g']);
      rightMemo.forEach((t, i) => {
        t.textContent = rm[i] ? rm[i][0] : '';
        t.setAttribute('class', rm[i] ? rm[i][1] : 'g');
      });

      const lm = [];
      const starting = s.eng.some(e => e.state === 'starting');
      if (starting) lm.push(['ENG START', 'g']);
      if (!d.anyEngRun && !starting && d.screensOn) lm.push(['NORMAL', 'g']);
      leftMemo.forEach((t, i) => {
        t.textContent = lm[i] ? lm[i][0] : '';
        t.setAttribute('class', lm[i] ? lm[i][1] : 'g');
      });
    },
  };
}

// ---------------------------------------------------------------- SD (lower)
const SD_PAGES = ['ENG', 'APU', 'ELEC', 'WHEEL', 'DOOR'];

export function buildSd(root, act) {
  const { svg, boot, main } = screenFrame();
  root.appendChild(svg);

  const pages = {
    DOOR: buildDoorPage(main),
    ELEC: buildElecPage(main),
    APU: buildApuPage(main),
    ENG: buildEngPage(main),
    WHEEL: buildWheelPage(main),
  };

  // bottom data line (TAT / SAT / UTC / GW)
  el('line', { x1: 10, y1: 415, x2: 590, y2: 415, class: 'sep' }, main);
  txt(main, 20, 440, 'TAT', 'w', 'start'); txt(main, 60, 440, '+14', 'g', 'start');
  txt(main, 110, 440, 'SAT', 'w', 'start'); txt(main, 150, 440, '+13', 'g', 'start');
  const clock = txt(main, 300, 440, '', 'g');
  txt(main, 470, 440, 'GW', 'w', 'start');
  const gw = txt(main, 510, 440, '', 'g', 'start');

  // page select buttons (stand-in for the ECAM control panel)
  const btnRow = document.createElement('div');
  btnRow.className = 'ecam-btns';
  const btns = {};
  for (const p of SD_PAGES) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = p;
    b.addEventListener('click', () => act.do(s => {
      s.sd.manual = s.sd.manual === p ? null : p;
    }));
    btns[p] = b;
    btnRow.appendChild(b);
  }
  root.appendChild(btnRow);

  return {
    update(s, d) {
      boot.style.display = d.booting ? '' : 'none';
      main.style.display = d.screensOn && !d.booting ? '' : 'none';
      const page = sdAutoPage(s, d);
      for (const p of SD_PAGES) {
        btns[p].classList.toggle('active', s.sd.manual === p);
        btns[p].classList.toggle('shown', page === p);
      }
      if (!d.screensOn || d.booting) return;
      for (const [name, pg] of Object.entries(pages)) {
        pg.g.style.display = name === page ? '' : 'none';
        if (name === page) pg.update(s, d);
      }
      const now = new Date();
      clock.textContent =
        `${String(now.getUTCHours()).padStart(2, '0')} H ${String(now.getUTCMinutes()).padStart(2, '0')}`;
      gw.textContent = String(Math.round((57000 + s.fob - 6264) / 100) * 100);
    },
  };
}

function pageTitle(g, name) {
  txt(g, 30, 35, name, 'w page-title', 'start');
  el('line', { x1: 28, y1: 42, x2: 30 + name.length * 15, y2: 42, class: 'sep-w' }, g);
}

function buildDoorPage(parent) {
  const g = el('g', {}, parent);
  pageTitle(g, 'DOOR/OXY');
  // fuselage outline
  el('path', {
    d: 'M 300 70 C 270 70 255 95 252 130 L 252 330 C 252 365 275 390 300 390 ' +
       'C 325 390 348 365 348 330 L 348 130 C 345 95 330 70 300 70 Z',
    class: 'outline',
  }, g);
  const doors = [
    ['CABIN', 130], ['CABIN', 330],
  ];
  for (const [name, y] of doors) {
    el('rect', { x: 246, y: y - 9, width: 8, height: 18, class: 'door-ok' }, g);
    el('rect', { x: 346, y: y - 9, width: 8, height: 18, class: 'door-ok' }, g);
    txt(g, 210, y + 5, name, 'w small', 'end');
  }
  el('rect', { x: 346, y: 196, width: 8, height: 18, class: 'door-ok' }, g);
  txt(g, 390, 210, 'CARGO', 'w small', 'start');
  txt(g, 300, 240, 'SLIDES DISARMED', 'w small');
  const oxy = txt(g, 460, 90, 'CKT OXY 1850 PSI', 'g small', 'end');
  void oxy;
  return { g, update() {} };
}

function buildElecPage(parent) {
  const g = el('g', {}, parent);
  pageTitle(g, 'ELEC');

  function box(x, y, w, h, title) {
    el('rect', { x, y, width: w, height: h, class: 'sysbox' }, g);
    return txt(g, x + w / 2, y + 18, title, 'w small');
  }
  // batteries
  box(60, 60, 110, 70, 'BAT 1');
  const bat1V = txt(g, 115, 90, '', 'g'); txt(g, 115, 112, 'V', 'c small');
  box(430, 60, 110, 70, 'BAT 2');
  const bat2V = txt(g, 485, 90, '', 'g'); txt(g, 485, 112, 'V', 'c small');
  // generators
  box(60, 250, 100, 80, 'GEN 1');
  const gen1S = txt(g, 110, 285, '', 'g');
  box(440, 250, 100, 80, 'GEN 2');
  const gen2S = txt(g, 490, 285, '', 'g');
  box(190, 250, 100, 80, 'APU GEN');
  const apuGenS = txt(g, 240, 285, '', 'g');
  box(310, 250, 100, 80, 'EXT PWR');
  const extS = txt(g, 360, 285, '', 'g');
  // bus bar
  const acBus = el('rect', { x: 100, y: 175, width: 400, height: 30, class: 'sysbox' }, g);
  const acTxt = txt(g, 300, 196, 'AC 1        AC 2', 'g');
  const dcTxt = txt(g, 300, 160, 'DC BAT', 'g');

  return {
    g,
    update(s, d) {
      bat1V.textContent = s.bat1 ? (d.acPower ? '28.1' : '25.6') : 'OFF';
      bat1V.setAttribute('class', s.bat1 ? 'g' : 'w');
      bat2V.textContent = s.bat2 ? (d.acPower ? '28.1' : '25.6') : 'OFF';
      bat2V.setAttribute('class', s.bat2 ? 'g' : 'w');
      gen1S.textContent = d.eng1Run && s.gen1 ? '24 %' : 'OFF';
      gen1S.setAttribute('class', d.eng1Run && s.gen1 ? 'g' : s.gen1 ? 'a' : 'w');
      gen2S.textContent = d.eng2Run && s.gen2 ? '24 %' : 'OFF';
      gen2S.setAttribute('class', d.eng2Run && s.gen2 ? 'g' : s.gen2 ? 'a' : 'w');
      apuGenS.textContent = d.apuAvail && s.apuGenPb ? '12 %' : 'OFF';
      apuGenS.setAttribute('class', d.apuAvail && s.apuGenPb ? 'g' : 'w');
      extS.textContent = s.extPwrOn ? 'ON' : 'AVAIL';
      extS.setAttribute('class', s.extPwrOn ? 'g' : 'w');
      acTxt.setAttribute('class', d.acPower ? 'g' : 'a');
      dcTxt.setAttribute('class', d.dcPower ? 'g' : 'a');
      void acBus;
    },
  };
}

function buildApuPage(parent) {
  const g = el('g', {}, parent);
  pageTitle(g, 'APU');
  txt(g, 160, 130, 'N', 'w'); txt(g, 185, 130, '%', 'c small', 'start');
  const setN = gauge(g, { cx: 240, cy: 170, r: 55, max: 110, redFrom: 105, decimals: 0 });
  txt(g, 160, 270, 'EGT', 'w'); txt(g, 195, 270, '°C', 'c small', 'start');
  const setEgt = gauge(g, { cx: 240, cy: 310, r: 55, max: 1100, redFrom: 1000, decimals: 0 });
  const flap = txt(g, 470, 130, '', 'g');
  const avail = txt(g, 300, 70, '', 'g mid');
  el('rect', { x: 400, y: 200, width: 140, height: 70, class: 'sysbox' }, g);
  txt(g, 470, 220, 'BLEED', 'w small');
  const bleedPsi = txt(g, 460, 250, '', 'g'); txt(g, 495, 250, 'PSI', 'c small', 'start');
  return {
    g,
    update(s, d) {
      setN(s.apu.n);
      setEgt(s.apu.egt);
      flap.textContent = s.apu.flap > 0.05 ? 'FLAP OPEN' : '';
      avail.textContent = d.apuAvail ? 'AVAIL' : '';
      bleedPsi.textContent = String(s.apuBleed && d.apuAvail ? 38 : 0);
    },
  };
}

function buildEngPage(parent) {
  const g = el('g', {}, parent);
  pageTitle(g, 'ENG');
  const engX = [170, 430], C = 300;
  const oilQ = [], oilP = [], ignTxt = [], svTxt = [];
  for (let i = 0; i < 2; i++) {
    const x = engX[i];
    oilQ.push(txt(g, x, 120, '', 'g big'));
    oilP.push(txt(g, x, 175, '', 'g big'));
    ignTxt.push(txt(g, x, 250, '', 'w'));
    svTxt.push(txt(g, x, 310, '', 'g'));
  }
  txt(g, C, 100, 'OIL', 'w'); txt(g, C, 118, 'QT', 'c small');
  txt(g, C, 172, 'PSI', 'c small');
  txt(g, C, 250, 'IGN', 'w');
  txt(g, C, 310, 'START VALVE', 'w small');
  return {
    g,
    update(s) {
      for (let i = 0; i < 2; i++) {
        const e = s.eng[i];
        oilQ[i].textContent = (14.5 - e.n2 * 0.03).toFixed(1);
        oilP[i].textContent = String(Math.round(e.n2 * 1.1));
        ignTxt[i].textContent = e.ignition ? (i === 0 ? 'A' : 'B') : '';
        svTxt[i].textContent = e.starter ? 'OPEN' : '';
      }
    },
  };
}

function buildWheelPage(parent) {
  const g = el('g', {}, parent);
  pageTitle(g, 'WHEEL');
  // main gear pairs
  const temps = [];
  const xs = [150, 230, 370, 450];
  for (const x of xs) {
    el('rect', { x: x - 22, y: 200, width: 44, height: 80, rx: 10, class: 'outline' }, g);
    temps.push(txt(g, x, 320, '', 'g'));
  }
  txt(g, 300, 320, '°C', 'c small');
  txt(g, 300, 180, 'BRAKE TEMP', 'w small');
  const rel = txt(g, 300, 100, '', 'g mid');
  return {
    g,
    update(s) {
      temps.forEach(t => { t.textContent = '35'; });
      rel.textContent = s.parkBrk ? 'PARK BRK : ON' : '';
    },
  };
}
