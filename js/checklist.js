// Procedure flow with auto-check. Items are evaluated strictly in order:
// the first unchecked item is "active"; when its predicate becomes true it is
// checked (sticky in s.ckDone) and the next item becomes active. This keeps
// shutdown items (e.g. BAT OFF) from self-checking at cold & dark.
import { ENG_MODE, CLEARANCE, centerEmpty } from './model.js';

const wingPumps = s => s.fuelPumps.L1 && s.fuelPumps.L2 && s.fuelPumps.R1 && s.fuelPumps.R2;
const ctrPumpsOff = s => !s.fuelPumps.C1 && !s.fuelPumps.C2;
const noPumps = s => Object.values(s.fuelPumps).every(v => !v);
const packsOn = s => s.pack1 && s.pack2;
const packsOff = s => !s.pack1 && !s.pack2;

export const PHASES = [
  {
    id: 'prep', title: 'COCKPIT PREPARATION', items: [
      { id: 'gpu', label: 'GND: GPU (EFB)', action: 'CONNECT', done: s => s.gnd.gpu },
      { id: 'bat', label: 'BAT 1 + 2', action: 'ON', done: s => s.bat1 && s.bat2 },
      { id: 'extpwr', label: 'EXT PWR', action: 'ON', done: s => s.extPwrOn },
      { id: 'adirs', label: 'ADIRS 1+2+3', action: 'NAV', done: s => s.adirs.every(a => a.sel === 'NAV') },
      { id: 'hyd', label: 'HYD (PUMPS / PTU)', action: 'CHECK', done: s => s.hyd.eng1Pump && s.hyd.ptu && s.hyd.eng2Pump },
      { id: 'elec-chk', label: 'ELEC (GEN / BUS TIE)', action: 'CHECK', done: s => s.gen1 && s.gen2 && s.apuGenPb && s.busTie },
      { id: 'fire-chk', label: 'FIRE PANEL', action: 'CHECK', done: () => true },
      { id: 'antiice', label: 'ANTI ICE', action: 'OFF', done: s => !s.antiIce.wing && !s.antiIce.eng1 && !s.antiIce.eng2 },
      { id: 'pack-chk', label: 'PACK 1 + 2', action: 'CHECK OFF', done: packsOff },
      { id: 'navlogo', label: 'NAV & LOGO LT', action: 'ON', done: s => s.lights.navLogo },
      { id: 'strobe', label: 'STROBE', action: 'AUTO', done: s => s.lights.strobe !== 'OFF' },
      { id: 'signs', label: 'SEAT BELTS / NO SMOKING', action: 'ON', done: s => s.signs.seatBelts && s.signs.noSmoking },
      { id: 'cdu-init', label: 'MCDU INIT A (FROM/TO)', action: 'ENTER', done: s => !!s.cdu.from },
      { id: 'cdu-initb', label: 'MCDU INIT B (ZFW/BLOCK)', action: 'ENTER', done: s => !!s.cdu.zfw && !!s.cdu.block },
      { id: 'cdu-perf', label: 'MCDU PERF (V1/VR/V2..)', action: 'ENTER', done: s => !!s.cdu.v1 && !!s.cdu.vr && !!s.cdu.v2 && !!s.cdu.flapsThs && !!s.cdu.transAlt },
      { id: 'fcu-managed', label: 'FCU SPD / HDG', action: 'MANAGED', done: s => s.fcu.spdManaged && s.fcu.hdgManaged },
      { id: 'fcu-alt', label: 'FCU INIT ALT', action: 'SET 6000', done: s => s.fcu.alt === CLEARANCE.initAlt },
      { id: 'fcu-baro', label: 'BARO', action: `QNH ${CLEARANCE.qnh}`, done: s => s.fcu.baroMode === 'QNH' && s.fcu.baro === CLEARANCE.qnh },
    ],
  },
  {
    id: 'beforestart', title: 'BEFORE START', items: [
      { id: 'fuel', label: 'WING FUEL PUMPS (4)', action: 'ON', done: wingPumps },
      { id: 'ctr', label: 'CTR TK PUMPS', action: 'AS RQRD', done: s => centerEmpty(s) ? ctrPumpsOff(s) : (s.fuelPumps.C1 && s.fuelPumps.C2) },
      { id: 'apum', label: 'APU MASTER SW', action: 'ON', done: s => s.apuMaster },
      { id: 'apus', label: 'APU START ... AVAIL', action: 'START', done: s => s.apu.state === 'avail' },
      { id: 'apub', label: 'APU BLEED', action: 'ON', done: s => s.apuBleed },
      { id: 'packs-on1', label: 'PACK 1 + 2', action: 'ON', done: packsOn },
      { id: 'xpdr-code', label: 'XPDR CODE', action: 'SET 2000', done: s => s.xpdr.code === '2000' },
      { id: 'xpdr-mode', label: 'XPDR MODE', action: 'STBY', done: s => s.xpdr.mode === 'STBY' },
      { id: 'parkbrk', label: 'PARKING BRAKE', action: 'CHECK ON', done: s => s.parkBrk },
      { id: 'beacon', label: 'BEACON', action: 'ON', done: s => s.lights.beacon },
      { id: 'packs-off1', label: 'PACK 1 + 2 (FOR START)', action: 'OFF', done: packsOff },
    ],
  },
  {
    id: 'engstart', title: 'ENGINE START', items: [
      { id: 'mode', label: 'ENG MODE SEL', action: 'IGN/START', done: s => ENG_MODE[s.engModeSel] === 'IGN/START' },
      { id: 'eng2', label: 'ENG MASTER 2 ... STABLE', action: 'ON', done: s => s.eng[1].state === 'running' && s.eng[1].n2 >= 58 },
      { id: 'eng1', label: 'ENG MASTER 1 ... STABLE', action: 'ON', done: s => s.eng[0].state === 'running' && s.eng[0].n2 >= 58 },
      { id: 'modenorm', label: 'ENG MODE SEL', action: 'NORM', done: s => ENG_MODE[s.engModeSel] === 'NORM' },
    ],
  },
  {
    id: 'afterstart', title: 'AFTER START', items: [
      { id: 'apuboff', label: 'APU BLEED', action: 'OFF', done: s => !s.apuBleed },
      { id: 'apumoff', label: 'APU MASTER SW', action: 'OFF', done: s => !s.apuMaster },
      { id: 'packs-on2', label: 'PACK 1 + 2', action: 'ON', done: packsOn },
      { id: 'extoff', label: 'EXT PWR', action: 'OFF', done: s => !s.extPwrOn },
      { id: 'splrs', label: 'GND SPLRS', action: 'ARM', done: s => s.spdBrkArmed },
      { id: 'flaps', label: 'FLAPS', action: 'SET 1', done: s => s.flapLever === 1 && Math.abs(s.flapPos - 1) < 0.05 },
      { id: 'fctl', label: 'F/CTL', action: 'CHECK', done: s => Object.values(s.fctl.done).every(v => v) },
      { id: 'autobrk', label: 'AUTO BRK', action: 'MAX', done: s => s.autoBrk === 'MAX' },
      { id: 'taxi-lt', label: 'NOSE TAXI / RWY TURN OFF', action: 'ON', done: s => s.lights.nose === 'TAXI' && s.lights.rwyTurnOff },
      { id: 'tocfg', label: 'T.O CONFIG', action: 'TEST', done: s => s.toConfig === 'normal' },
    ],
  },
  {
    id: 'shutdown', title: 'SHUTDOWN & SECURING', items: [
      { id: 'sd-parkbrk', label: 'PARKING BRAKE', action: 'ON', done: s => s.parkBrk },
      { id: 'sd-flaps', label: 'FLAPS', action: '0', done: s => s.flapLever === 0 && s.flapPos < 0.05 },
      { id: 'sd-splrs', label: 'GND SPLRS', action: 'DISARM', done: s => !s.spdBrkArmed },
      { id: 'sd-autobrk', label: 'AUTO BRK', action: 'OFF', done: s => s.autoBrk === 'OFF' },
      { id: 'sd-taxi-lt', label: 'NOSE / RWY TURN OFF', action: 'OFF', done: s => s.lights.nose === 'OFF' && !s.lights.rwyTurnOff },
      { id: 'sd-ext', label: 'EXT PWR', action: 'ON', done: s => s.extPwrOn },
      { id: 'sd-eng', label: 'ENG MASTER 1 + 2', action: 'OFF', done: s => s.eng.every(e => e.state === 'off') && !s.engMaster[0] && !s.engMaster[1] },
      { id: 'sd-beacon', label: 'BEACON', action: 'OFF', done: s => !s.lights.beacon },
      { id: 'sd-belts', label: 'SEAT BELTS', action: 'OFF', done: s => !s.signs.seatBelts },
      { id: 'sd-packs', label: 'PACK 1 + 2', action: 'OFF', done: packsOff },
      { id: 'sd-fuel', label: 'FUEL PUMPS', action: 'OFF', done: noPumps },
      { id: 'sd-adirs', label: 'ADIRS 1+2+3', action: 'OFF', done: s => s.adirs.every(a => a.sel === 'OFF') },
      { id: 'sd-navlogo', label: 'NAV & LOGO LT', action: 'OFF', done: s => !s.lights.navLogo },
      { id: 'sd-extoff', label: 'EXT PWR', action: 'OFF', done: s => !s.extPwrOn },
      { id: 'sd-bat', label: 'BAT 1 + 2', action: 'OFF', done: s => !s.bat1 && !s.bat2 },
    ],
  },
];

const ALL_ITEMS = PHASES.flatMap(p => p.items.map(it => ({ ...it, phase: p.id })));

// Advance the checklist; call every tick. Only the first unchecked item is
// evaluated, cascading through consecutive satisfied items in one pass.
export function tickChecklist(s) {
  let changed = false;
  for (const it of ALL_ITEMS) {
    if (s.ckDone[it.id]) continue;
    if (!it.done(s)) break;
    s.ckDone[it.id] = true;
    changed = true;
  }
  return changed;
}

export function activeItem(s) {
  return ALL_ITEMS.find(it => !s.ckDone[it.id]) || null;
}

export function currentPhase(s) {
  const it = activeItem(s);
  if (!it) return null;
  return PHASES.find(p => p.id === it.phase);
}

// --- DOM ---
export function buildChecklist(root, act) {
  const items = new Map();
  for (const p of PHASES) {
    const ph = document.createElement('div');
    ph.className = 'ck-phase';
    const h = document.createElement('h3');
    h.textContent = p.title;
    ph.appendChild(h);
    for (const it of p.items) {
      const row = document.createElement('div');
      row.className = 'ck-item';
      row.innerHTML = `<span class="ck-box"></span><span class="ck-label">${it.label}</span>` +
        `<span class="ck-dots"></span><span class="ck-action">${it.action}</span>`;
      ph.appendChild(row);
      items.set(it.id, { row, phaseEl: ph });
    }
    root.appendChild(ph);
  }
  const doneMsg = document.createElement('div');
  doneMsg.className = 'ck-complete';
  doneMsg.textContent = '✓ FLOW COMPLETE — COLD & DARK';
  doneMsg.style.display = 'none';
  root.appendChild(doneMsg);
  void act;

  let lastActive = null;
  return {
    update(s) {
      const active = activeItem(s);
      for (const it of ALL_ITEMS) {
        const { row } = items.get(it.id);
        row.classList.toggle('done', !!s.ckDone[it.id]);
        row.classList.toggle('active', active && active.id === it.id);
      }
      doneMsg.style.display = active ? 'none' : '';
      const activeId = active ? active.id : null;
      if (activeId !== lastActive) {
        lastActive = activeId;
        if (active) {
          items.get(activeId).row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
      }
    },
  };
}
