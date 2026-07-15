// Pedestal: ENG mode selector, ENG master levers, transponder, parking brake
import { rotary, masterLever, parkBrkHandle, toggle3, section } from '../components.js';
import { ENG_MODE, XPDR_MODE } from '../model.js';

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
    positions: ENG_MODE,
    get: () => act.state().engModeSel,
    set: v => act.do(s => { s.engModeSel = v; }),
  }));
  add(eng.body, masterLever({
    label: '2',
    get: () => act.state().engMaster[1],
    set: v => act.do(s => { s.engMaster[1] = v; }),
  }));

  // --- ATC / XPDR ---
  const atc = section('ATC / XPDR');
  add(atc.body, xpdrCode(act));
  add(atc.body, toggle3({
    label: 'MODE', positions: XPDR_MODE,
    get: () => XPDR_MODE.indexOf(act.state().xpdr.mode),
    set: v => act.do(s => { s.xpdr.mode = XPDR_MODE[v]; }),
  }));

  const brk = section('BRAKES', 'pedestal-brk');
  add(brk.body, parkBrkHandle({
    get: () => act.state().parkBrk,
    set: v => act.do(s => { s.parkBrk = v; }),
  }));

  root.append(eng.el, atc.el, brk.el);
  return { update: (s, d) => updaters.forEach(u => u.update(s, d)) };
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
