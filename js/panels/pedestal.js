// Pedestal: ENG mode selector, ENG master levers, flaps/speed brake, F/CTL
// check, autobrake, transponder, parking brake
import { rotary, masterLever, parkBrkHandle, toggle, toggle3, korry, section } from '../components.js';
import { ENG_MODE, XPDR_MODE, FLAP_POS, AUTO_BRK } from '../model.js';

export function buildPedestal(root, act) {
  const updaters = [];
  const add = (parent, w) => { parent.appendChild(w.el); updaters.push(w); };

  const eng = section('ENG', 'pedestal-eng');
  add(eng.body, masterLever({
    label: '1',
    get: () => act.state().engMaster[0],
    set: v => act.do(s => { s.engMaster[0] = v; }),
  }));
  add(eng.body, rotary({
    label: 'MODE',
    guide: 'eng-mode',   // label 'MODE' is shared with the XPDR selector
    positions: ENG_MODE,
    get: () => act.state().engModeSel,
    set: v => act.do(s => { s.engModeSel = v; }),
  }));
  add(eng.body, masterLever({
    label: '2',
    get: () => act.state().engMaster[1],
    set: v => act.do(s => { s.engMaster[1] = v; }),
  }));

  // --- THRUST LEVERS (detent buttons) + reversers ---
  const thr = section('THRUST');
  add(thr.body, thrustLevers(act));

  // --- LANDING GEAR ---
  const lg = section('L/G');
  add(lg.body, gearLever(act));

  // --- FLAPS / SPD BRK ---
  const cfg = section('FLAPS / SPD BRK');
  add(cfg.body, rotary({
    label: 'FLAPS',
    positions: FLAP_POS,
    get: () => act.state().flapLever,
    set: v => act.do(s => { s.flapLever = v; s.toConfig = null; }),
  }));
  add(cfg.body, toggle({
    label: 'SPD BRK', onText: 'ARM', offText: 'RET',
    get: () => act.state().spdBrkArmed,
    set: v => act.do(s => { s.spdBrkArmed = v; }),
  }));

  // --- F/CTL check (stands in for full sidestick/rudder deflections) ---
  const fc = section('F/CTL CHECK');
  const dirs = [
    ['◀', 'left', s => { s.fctl.ail = -1; s.fctl.done.left = true; }],
    ['▲', 'up', s => { s.fctl.elev = 1; s.fctl.done.up = true; }],
    ['▼', 'down', s => { s.fctl.elev = -1; s.fctl.done.down = true; }],
    ['▶', 'right', s => { s.fctl.ail = 1; s.fctl.done.right = true; }],
    ['RUD L', 'rudl', s => { s.fctl.rud = -1; s.fctl.done.rudl = true; }],
    ['RUD R', 'rudr', s => { s.fctl.rud = 1; s.fctl.done.rudr = true; }],
  ];
  for (const [label, key, apply] of dirs) {
    add(fc.body, fctlButton(label, key, act, apply));
  }

  // --- AUTO BRK ---
  const ab = section('AUTO BRK');
  for (const mode of AUTO_BRK.slice(1)) {
    add(ab.body, korry({
      label: mode, top: 'DECEL', bottom: 'ON', topColor: 'green', botColor: 'blue',
      botLit: s => s.autoBrk === mode,
      onPress: () => act.do(s => { s.autoBrk = s.autoBrk === mode ? 'OFF' : mode; }),
    }));
  }

  // --- ATC / XPDR ---
  const atc = section('ATC / XPDR');
  add(atc.body, xpdrCode(act));
  add(atc.body, toggle3({
    label: 'MODE', guide: 'xpdr-mode', positions: XPDR_MODE,
    get: () => XPDR_MODE.indexOf(act.state().xpdr.mode),
    set: v => act.do(s => { s.xpdr.mode = XPDR_MODE[v]; }),
  }));

  const brk = section('BRAKES', 'pedestal-brk');
  add(brk.body, parkBrkHandle({
    get: () => act.state().parkBrk,
    set: v => act.do(s => { s.parkBrk = v; }),
  }));

  root.append(eng.el, thr.el, lg.el, cfg.el, fc.el, ab.el, atc.el, brk.el);
  return { update: (s, d) => updaters.forEach(u => u.update(s, d)) };
}

// Thrust detent selector: TOGA / FLX / CLB / IDLE stacked, plus REV MAX.
function thrustLevers(act) {
  const wrap = document.createElement('div');
  wrap.className = 'ctl thr-levers';
  wrap.dataset.help = '@thr';
  wrap.dataset.helpTitle = 'THRUST LEVERS';
  const col = document.createElement('div');
  col.className = 'thr-col';
  wrap.appendChild(col);
  const btns = {};
  for (const det of ['TOGA', 'FLX', 'CLB', 'IDLE']) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'thr-detent';
    b.dataset.guide = 'thr-' + det;
    b.textContent = det === 'FLX' ? 'FLX/MCT' : det;
    b.addEventListener('click', () => act.do(s => {
      s.flight.thrust = det;
      if (det !== 'IDLE') s.flight.rev = false;
    }));
    btns[det] = b;
    col.appendChild(b);
  }
  const rev = document.createElement('button');
  rev.type = 'button';
  rev.className = 'thr-detent thr-rev';
  rev.textContent = 'REV MAX';
  rev.addEventListener('click', () => act.do(s => {
    if (s.flight.thrust === 'IDLE') s.flight.rev = !s.flight.rev;
  }));
  col.appendChild(rev);
  return {
    el: wrap,
    update(s) {
      for (const [det, b] of Object.entries(btns)) {
        b.classList.toggle('active', s.flight.thrust === det && !s.flight.rev);
      }
      rev.classList.toggle('active', s.flight.rev);
    },
  };
}

// Landing gear lever with position indicator.
function gearLever(act) {
  const wrap = document.createElement('div');
  wrap.className = 'ctl';
  const ind = document.createElement('div');
  ind.className = 'gear-ind';
  wrap.appendChild(ind);
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'gear-lever';
  wrap.appendChild(b);
  const cap = document.createElement('div');
  cap.className = 'ctl-label';
  cap.textContent = 'LDG GEAR';
  wrap.appendChild(cap);
  b.addEventListener('click', () => act.do(s => { s.flight.gear = !s.flight.gear; }));
  return {
    el: wrap,
    update(s, d) {
      const f = s.flight;
      b.classList.toggle('up', !f.gear);
      b.textContent = f.gear ? 'DOWN' : 'UP';
      const moving = (f.gear ? 1 : 0) !== f.gearPos;
      ind.textContent = !d.dcPower ? '' : moving ? 'UNLK' : f.gearPos >= 1 ? '▼▼▼' : '';
      ind.className = 'gear-ind ' + (moving ? 'gear-red' : 'gear-green');
    },
  };
}

// F/CTL check button: lights up once its deflection has been exercised.
// Inputs only register with hydraulic pressure (an engine running).
function fctlButton(label, key, act, apply) {
  const wrap = document.createElement('div');
  wrap.className = 'ctl';
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'fctl-btn';
  b.textContent = label;
  b.addEventListener('click', () => act.do(s => {
    if (s.eng.some(e => e.state === 'running')) apply(s);
  }));
  wrap.appendChild(b);
  return {
    el: wrap,
    update(s) { b.classList.toggle('done', s.fctl.done[key]); },
  };
}

// Squawk code entry: four digit buttons, each tap cycles 0-7.
function xpdrCode(act) {
  const wrap = document.createElement('div');
  wrap.className = 'ctl';
  const row = document.createElement('div');
  row.className = 'xpdr-code';
  const digits = [];
  for (let i = 0; i < 4; i++) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'xpdr-digit';
    b.addEventListener('click', () => act.do(s => {
      const d = s.xpdr.code.split('');
      d[i] = String((Number(d[i]) + 1) % 8);
      s.xpdr.code = d.join('');
    }));
    row.appendChild(b);
    digits.push(b);
  }
  wrap.appendChild(row);
  const cap = document.createElement('div');
  cap.className = 'ctl-label';
  cap.textContent = 'CODE';
  wrap.appendChild(cap);
  return {
    el: wrap,
    update(s, d) {
      digits.forEach((b, i) => {
        b.textContent = s.xpdr.code[i];
        b.classList.toggle('powered', d.dcPower);
      });
    },
  };
}
