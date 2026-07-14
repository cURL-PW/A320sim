// Overhead panel: ELEC / APU / ADIRS / FUEL / AIR COND / EXT LT / SIGNS
import { korry, rotary, toggle, section } from '../components.js';
import { IR_MODE } from '../model.js';

export function buildOverhead(root, act) {
  const updaters = [];
  const add = (parent, w) => { parent.appendChild(w.el); updaters.push(w); };

  // --- ADIRS ---
  const adirs = section('ADIRS');
  for (let i = 0; i < 3; i++) {
    add(adirs.body, rotary({
      label: `IR ${i + 1}`,
      positions: IR_MODE,
      get: () => IR_MODE.indexOf(act.state().adirs[i].sel),
      set: v => act.do(s => { s.adirs[i].sel = IR_MODE[v]; }),
    }));
  }
  add(adirs.body, indicator('ALIGN', 'white', (s, d) =>
    d.dcPower && s.adirs.some(a => a.sel !== 'OFF' && !a.aligned), true));
  add(adirs.body, indicator('ON BAT', 'amber', (s, d) =>
    d.batOnly && s.adirs.some(a => a.sel !== 'OFF')));

  // --- ELEC ---
  const elec = section('ELEC');
  add(elec.body, korry({
    label: 'BAT 1', top: 'FAULT', bottom: 'OFF', botColor: 'white',
    botLit: s => !s.bat1,
    onPress: () => act.do(s => { s.bat1 = !s.bat1; }),
  }));
  add(elec.body, korry({
    label: 'BAT 2', top: 'FAULT', bottom: 'OFF', botColor: 'white',
    botLit: s => !s.bat2,
    onPress: () => act.do(s => { s.bat2 = !s.bat2; }),
  }));
  add(elec.body, korry({
    label: 'EXT PWR', top: 'AVAIL', bottom: 'ON', topColor: 'green', botColor: 'blue',
    topLit: s => !s.extPwrOn,          // GPU is always plugged in while parked
    botLit: s => s.extPwrOn,
    onPress: () => act.do(s => { s.extPwrOn = !s.extPwrOn; }),
  }));
  add(elec.body, korry({
    label: 'GEN 1', top: 'FAULT', bottom: 'OFF', botColor: 'white',
    topLit: (s, d) => s.gen1 && !d.eng1Run,
    botLit: s => !s.gen1,
    onPress: () => act.do(s => { s.gen1 = !s.gen1; }),
  }));
  add(elec.body, korry({
    label: 'GEN 2', top: 'FAULT', bottom: 'OFF', botColor: 'white',
    topLit: (s, d) => s.gen2 && !d.eng2Run,
    botLit: s => !s.gen2,
    onPress: () => act.do(s => { s.gen2 = !s.gen2; }),
  }));
  add(elec.body, korry({
    label: 'APU GEN', top: 'FAULT', bottom: 'OFF', botColor: 'white',
    botLit: s => !s.apuGenPb,
    onPress: () => act.do(s => { s.apuGenPb = !s.apuGenPb; }),
  }));

  // --- APU ---
  const apu = section('APU');
  add(apu.body, korry({
    label: 'MASTER SW', top: 'FAULT', bottom: 'ON', botColor: 'blue',
    botLit: s => s.apuMaster,
    onPress: () => act.do(s => { s.apuMaster = !s.apuMaster; }),
  }));
  add(apu.body, korry({
    label: 'START', top: 'AVAIL', bottom: 'ON', topColor: 'green', botColor: 'blue',
    topLit: s => s.apu.state === 'avail',
    botLit: s => s.apuStartPb || s.apu.state === 'starting',
    onPress: () => act.do(s => { if (s.apuMaster) s.apuStartPb = true; }),
  }));

  // --- FUEL ---
  const fuel = section('FUEL');
  for (const key of ['L1', 'L2', 'C1', 'C2', 'R1', 'R2']) {
    const label = key[0] === 'C' ? `CTR ${key[1]}` : `${key[0]} TK ${key[1]}`;
    add(fuel.body, korry({
      label, top: 'FAULT', bottom: 'OFF', botColor: 'white',
      botLit: s => !s.fuelPumps[key],
      onPress: () => act.do(s => { s.fuelPumps[key] = !s.fuelPumps[key]; }),
    }));
  }

  // --- AIR COND ---
  const air = section('AIR COND');
  add(air.body, korry({
    label: 'PACK 1', top: 'FAULT', bottom: 'OFF', botColor: 'white',
    botLit: s => !s.pack1,
    onPress: () => act.do(s => { s.pack1 = !s.pack1; }),
  }));
  add(air.body, korry({
    label: 'PACK 2', top: 'FAULT', bottom: 'OFF', botColor: 'white',
    botLit: s => !s.pack2,
    onPress: () => act.do(s => { s.pack2 = !s.pack2; }),
  }));
  add(air.body, korry({
    label: 'ENG 1 BLEED', top: 'FAULT', bottom: 'OFF', botColor: 'white',
    botLit: s => !s.engBleed1,
    onPress: () => act.do(s => { s.engBleed1 = !s.engBleed1; }),
  }));
  add(air.body, korry({
    label: 'ENG 2 BLEED', top: 'FAULT', bottom: 'OFF', botColor: 'white',
    botLit: s => !s.engBleed2,
    onPress: () => act.do(s => { s.engBleed2 = !s.engBleed2; }),
  }));
  add(air.body, korry({
    label: 'APU BLEED', top: 'FAULT', bottom: 'ON', botColor: 'blue',
    botLit: s => s.apuBleed,
    onPress: () => act.do(s => { s.apuBleed = !s.apuBleed; }),
  }));

  // --- EXT LT ---
  const lt = section('EXT LT');
  add(lt.body, toggle({ label: 'BEACON', get: () => act.state().lights.beacon,
    set: v => act.do(s => { s.lights.beacon = v; }) }));
  add(lt.body, toggle({ label: 'NAV & LOGO', get: () => act.state().lights.navLogo,
    set: v => act.do(s => { s.lights.navLogo = v; }) }));
  add(lt.body, toggle({ label: 'STROBE', get: () => act.state().lights.strobe,
    set: v => act.do(s => { s.lights.strobe = v; }) }));
  add(lt.body, toggle({ label: 'WING', get: () => act.state().lights.wing,
    set: v => act.do(s => { s.lights.wing = v; }) }));

  // --- SIGNS ---
  const signs = section('SIGNS');
  add(signs.body, toggle({ label: 'SEAT BELTS', get: () => act.state().signs.seatBelts,
    set: v => act.do(s => { s.signs.seatBelts = v; }) }));
  add(signs.body, toggle({ label: 'NO SMOKING', get: () => act.state().signs.noSmoking,
    set: v => act.do(s => { s.signs.noSmoking = v; }) }));

  root.append(adirs.el, elec.el, apu.el, fuel.el, air.el, lt.el, signs.el);
  return { update: (s, d) => updaters.forEach(u => u.update(s, d)) };
}

// Simple annunciator light (not a button).
function indicator(text, color, lit, flash = false) {
  const wrap = document.createElement('div');
  wrap.className = 'ctl';
  const lamp = document.createElement('div');
  lamp.className = 'annun';
  lamp.textContent = text;
  wrap.appendChild(lamp);
  const cap = document.createElement('div');
  cap.className = 'ctl-label';
  cap.textContent = '';
  wrap.appendChild(cap);
  return {
    el: wrap,
    update(s, d) {
      const on = lit(s, d);
      lamp.className = 'annun' + (on ? ' lit-' + color + (flash ? ' flash' : '') : '');
    },
  };
}
