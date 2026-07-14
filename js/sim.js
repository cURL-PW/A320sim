// Systems simulation. Runs only in the main window at ~10 Hz.
import { derive, ENG_MODE } from './model.js';

// Move v toward target at |rate| units per second.
function approach(v, target, rate, dt) {
  const d = target - v;
  const step = rate * dt;
  if (Math.abs(d) <= step) return target;
  return v + Math.sign(d) * step;
}

export function tick(s, dt) {
  const d = derive(s);
  s.t += dt;
  s.acTime = d.acPower ? s.acTime + dt : 0;

  tickApu(s, d, dt);
  tickAdirs(s, d, dt);
  tickEngines(s, d, dt);

  // Fuel burn (very rough): engines + APU
  const burn = (s.eng[0].ff + s.eng[1].ff + (s.apu.n > 10 ? 120 : 0)) / 3600;
  s.fob = Math.max(0, s.fob - burn * dt);
}

function tickApu(s, d, dt) {
  const a = s.apu;
  if (s.apuMaster && d.dcPower) {
    a.flap = approach(a.flap, 1, 1 / 3, dt); // intake flap opens in ~3 s
    if (a.state === 'off' || a.state === 'cooldown') a.state = 'flap';
    if (a.state === 'flap' && a.flap >= 1) a.state = 'ready';
    if (s.apuStartPb && (a.state === 'ready' || a.state === 'flap')) {
      if (a.flap >= 1) a.state = 'starting';
    }
    if (a.state === 'starting') {
      // ~25 s spool-up, slowing near the top
      const rate = a.n < 60 ? 5.5 : a.n < 90 ? 3.5 : 1.8;
      a.n = approach(a.n, 100, rate, dt);
      // EGT peaks mid-start then settles
      const egtTarget = a.n < 55 ? 150 + a.n * 11 : 1050 - a.n * 7;
      a.egt = approach(a.egt, egtTarget, 90, dt);
      if (a.n >= 99.5) { a.state = 'avail'; s.apuStartPb = false; }
    } else if (a.state === 'avail') {
      a.egt = approach(a.egt, 345, 25, dt);
    }
  } else {
    // Master off (or no DC): spool down and close the flap
    s.apuStartPb = false;
    if (a.n > 0.2) {
      a.state = 'cooldown';
      a.n = approach(a.n, 0, 6, dt);
      a.egt = approach(a.egt, 10, 30, dt);
    } else if (a.state !== 'off') {
      a.n = 0;
      a.flap = approach(a.flap, 0, 1 / 3, dt);
      if (a.flap <= 0) a.state = 'off';
    }
    if (!d.dcPower && a.n <= 0.2) { a.state = 'off'; a.flap = 0; a.egt = 10; }
  }
}

function tickAdirs(s, d, dt) {
  const ALIGN_TIME = 30; // accelerated (real ~10 min)
  for (const ir of s.adirs) {
    if (ir.sel !== 'OFF' && d.dcPower) {
      if (!ir.aligned) {
        ir.align = Math.min(ALIGN_TIME, ir.align + dt);
        if (ir.align >= ALIGN_TIME) ir.aligned = true;
      }
    } else {
      ir.align = 0;
      ir.aligned = false;
    }
  }
}

function tickEngines(s, d, dt) {
  const IDLE = { n1: 19.5, n2: 58.5, egt: 390, ff: 290 };
  for (let i = 0; i < 2; i++) {
    const e = s.eng[i];
    const other = s.eng[1 - i];
    const otherBleed = other.state === 'running' && (i === 0 ? s.engBleed2 : s.engBleed1);
    const bleedOk = (s.apuBleed && d.apuAvail) || otherBleed;
    const startPermitted = d.acPower && bleedOk && ENG_MODE[s.engModeSel] === 'IGN/START';

    if (s.engMaster[i]) {
      if (e.state === 'off' && startPermitted) e.state = 'starting';
      if (e.state === 'starting') {
        if (!d.acPower || !bleedOk) { e.state = 'spooldown'; continue; }
        e.starter = e.n2 < 50;
        e.ignition = e.n2 >= 16 && e.n2 < 55;
        const rate = e.n2 < 25 ? 2.8 : e.n2 < 50 ? 2.2 : 1.6;
        e.n2 = approach(e.n2, IDLE.n2, rate, dt);
        if (e.n2 >= 16) {
          e.ff = approach(e.ff, 120 + e.n2 * 3, 60, dt);
          const egtTarget = e.n2 < 45 ? 100 + e.n2 * 12 : 620;
          e.egt = approach(e.egt, egtTarget, 55, dt);
        }
        e.n1 = approach(e.n1, e.n2 * 0.28, 1.2, dt);
        if (e.n2 >= IDLE.n2 - 0.5) {
          e.state = 'running';
          e.starter = false;
          e.ignition = false;
        }
      } else if (e.state === 'running') {
        e.n1 = approach(e.n1, IDLE.n1, 1.5, dt);
        e.n2 = approach(e.n2, IDLE.n2, 1.5, dt);
        e.egt = approach(e.egt, IDLE.egt, 30, dt);
        e.ff = approach(e.ff, IDLE.ff, 40, dt);
      }
      // master ON but no start permission: nothing happens (valve stays closed)
    } else if (e.state !== 'off') {
      e.state = 'spooldown';
      e.starter = false;
      e.ignition = false;
      e.n1 = approach(e.n1, 0, 2.5, dt);
      e.n2 = approach(e.n2, 0, 3.5, dt);
      e.ff = approach(e.ff, 0, 300, dt);
      e.egt = approach(e.egt, 10, 20, dt);
      if (e.n2 <= 0.2) { e.state = 'off'; e.n1 = 0; e.n2 = 0; e.ff = 0; }
    }
  }
}

// Which SD page should the lower ECAM show?
export function sdAutoPage(s, d) {
  if (s.sd.manual) return s.sd.manual;
  if (s.eng.some(e => e.state === 'starting') ||
      (ENG_MODE[s.engModeSel] === 'IGN/START' && s.engMaster.some(m => m))) return 'ENG';
  if (s.apuMaster && s.apu.state !== 'avail') return 'APU';
  if (d.anyEngRun) return 'WHEEL';
  return 'DOOR';
}
