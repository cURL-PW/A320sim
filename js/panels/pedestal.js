// Pedestal: ENG mode selector, ENG master levers, parking brake
import { rotary, masterLever, parkBrkHandle, section } from '../components.js';
import { ENG_MODE } from '../model.js';

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

  const brk = section('BRAKES', 'pedestal-brk');
  add(brk.body, parkBrkHandle({
    get: () => act.state().parkBrk,
    set: v => act.do(s => { s.parkBrk = v; }),
  }));

  root.append(eng.el, brk.el);
  return { update: (s, d) => updaters.forEach(u => u.update(s, d)) };
}
