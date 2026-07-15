// Overhead panel: GND / ADIRS / ELEC / APU / HYD / FIRE / FUEL / AIR COND /
// ANTI ICE / EXT LT / SIGNS
import { korry, rotary, toggle, toggle3, section } from '../components.js';
import { IR_MODE, STROBE_MODE, NOSE_LT, START_FAULT, FUEL_PLANS, centerEmpty, LOADSHEET } from '../model.js';

export function buildOverhead(root, act) {
  const updaters = [];
  const add = (parent, w) => { parent.appendChild(w.el); updaters.push(w); };

  // --- GND SERVICES (EFB stand-in) ---
  const gnd = section('GND SERVICES (EFB)');
  add(gnd.body, toggle({
    label: 'GPU', onText: 'CONN', offText: 'DISC',
    get: () => act.state().gnd.gpu,
    set: v => act.do(s => { s.gnd.gpu = v; }),
  }));
  add(gnd.body, toggle({
    label: 'FUEL', onText: '12.0T', offText: '6.3T',
    get: () => act.state().gnd.fuelPlan === 'CTR',
    set: v => act.do(s => {
      // refuelling only with engines shut down
      if (s.eng.some(e => e.state !== 'off')) return;
      s.gnd.fuelPlan = v ? 'CTR' : 'WING';
      s.fob = FUEL_PLANS[s.gnd.fuelPlan].fob;
    }),
  }));
  add(gnd.body, rotary({
    label: 'START FAULT',
    positions: START_FAULT,
    get: () => START_FAULT.indexOf(act.state().gnd.startFault),
    set: v => act.do(s => { s.gnd.startFault = START_FAULT[v]; }),
  }));
  const load = document.createElement('div');
  load.className = 'gnd-load';
  gnd.body.appendChild(load);
  updaters.push({
    update(s) {
      load.innerHTML = `LOADSHEET<br>ZFW ${LOADSHEET.zfw.toFixed(1)} / CG ${LOADSHEET.zfwcg.toFixed(1)}` +
        `<br>BLOCK ${FUEL_PLANS[s.gnd.fuelPlan].block.toFixed(1)}` +
        `<br>CTR TK ${centerEmpty(s) ? 'EMPTY' : 'FUELED'}`;
    },
  });

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
    topLit: s => s.gnd.gpu && !s.extPwrOn,   // AVAIL only once the GPU is connected
    botLit: s => s.extPwrOn,
    onPress: () => act.do(s => { if (s.gnd.gpu) s.extPwrOn = !s.extPwrOn; }),
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
  add(elec.body, korry({
    label: 'BUS TIE', top: '', bottom: 'OFF', botColor: 'white',
    botLit: s => !s.busTie,
    onPress: () => act.do(s => { s.busTie = !s.busTie; }),
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

  // --- HYD (verify-only, normal positions) ---
  const hyd = section('HYD');
  add(hyd.body, korry({
    label: 'ENG 1 PUMP', top: 'FAULT', bottom: 'OFF', botColor: 'white',
    topLit: (s, d) => s.hyd.eng1Pump && !d.eng1Run,   // low pressure until engine runs
    botLit: s => !s.hyd.eng1Pump,
    onPress: () => act.do(s => { s.hyd.eng1Pump = !s.hyd.eng1Pump; }),
  }));
  add(hyd.body, korry({
    label: 'PTU', top: 'FAULT', bottom: 'OFF', botColor: 'white',
    botLit: s => !s.hyd.ptu,
    onPress: () => act.do(s => { s.hyd.ptu = !s.hyd.ptu; }),
  }));
  add(hyd.body, korry({
    label: 'ENG 2 PUMP', top: 'FAULT', bottom: 'OFF', botColor: 'white',
    topLit: (s, d) => s.hyd.eng2Pump && !d.eng2Run,
    botLit: s => !s.hyd.eng2Pump,
    onPress: () => act.do(s => { s.hyd.eng2Pump = !s.hyd.eng2Pump; }),
  }));

  // --- FIRE (verify-only: guarded pushbuttons, normally dark) ---
  const fire = section('FIRE');
  for (const label of ['ENG 1', 'APU', 'ENG 2']) {
    add(fire.body, korry({
      label, top: 'FIRE', bottom: '', topColor: 'red',
      onPress: () => {},   // guarded — no action in this trainer
    }));
  }

  // --- FUEL ---
  const fuel = section('FUEL');
  for (const key of ['L1', 'L2', 'C1', 'C2', 'R1', 'R2']) {
    const isCtr = key[0] === 'C';
    const label = isCtr ? `CTR ${key[1]}` : `${key[0]} TK ${key[1]}`;
    add(fuel.body, korry({
      label, top: 'FAULT', bottom: 'OFF', botColor: 'white',
      // centre pumps on an empty centre tank -> low pressure FAULT
      topLit: s => isCtr && centerEmpty(s) && s.fuelPumps[key],
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

  // --- ANTI ICE ---
  const ai = section('ANTI ICE');
  for (const [key, label] of [['wing', 'WING'], ['eng1', 'ENG 1'], ['eng2', 'ENG 2']]) {
    add(ai.body, korry({
      label, top: 'FAULT', bottom: 'ON', botColor: 'blue',
      botLit: s => s.antiIce[key],
      onPress: () => act.do(s => { s.antiIce[key] = !s.antiIce[key]; }),
    }));
  }

  // --- EXT LT ---
  const lt = section('EXT LT');
  add(lt.body, toggle({ label: 'BEACON', get: () => act.state().lights.beacon,
    set: v => act.do(s => { s.lights.beacon = v; }) }));
  add(lt.body, toggle({ label: 'NAV & LOGO', get: () => act.state().lights.navLogo,
    set: v => act.do(s => { s.lights.navLogo = v; }) }));
  add(lt.body, toggle3({
    label: 'STROBE', positions: STROBE_MODE,
    get: () => STROBE_MODE.indexOf(act.state().lights.strobe),
    set: v => act.do(s => { s.lights.strobe = STROBE_MODE[v]; }),
  }));
  add(lt.body, toggle({ label: 'WING', get: () => act.state().lights.wing,
    set: v => act.do(s => { s.lights.wing = v; }) }));
  add(lt.body, toggle3({
    label: 'NOSE', positions: NOSE_LT,
    get: () => NOSE_LT.indexOf(act.state().lights.nose),
    set: v => act.do(s => { s.lights.nose = NOSE_LT[v]; }),
  }));
  add(lt.body, toggle({ label: 'RWY TURN OFF', get: () => act.state().lights.rwyTurnOff,
    set: v => act.do(s => { s.lights.rwyTurnOff = v; }) }));

  // --- SIGNS ---
  const signs = section('SIGNS');
  add(signs.body, toggle({ label: 'SEAT BELTS', get: () => act.state().signs.seatBelts,
    set: v => act.do(s => { s.signs.seatBelts = v; }) }));
  add(signs.body, toggle({ label: 'NO SMOKING', get: () => act.state().signs.noSmoking,
    set: v => act.do(s => { s.signs.noSmoking = v; }) }));

  root.append(gnd.el, adirs.el, elec.el, apu.el, hyd.el, fire.el, fuel.el, air.el, ai.el, lt.el, signs.el);
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
