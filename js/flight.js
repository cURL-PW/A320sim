// Autoflight-based flight model. The aircraft flies the scenario route by
// itself; the trainee performs the SOP actions (thrust detents, gear, flaps,
// AP, FCU, reversers). Speeds/altitudes follow scripted profiles — this is a
// procedure trainer, not a physics simulation.
import { getScenario, routePoint, totalDistance } from './navdata.js';

function approach(v, target, rate, dt) {
  const d = target - v;
  const step = rate * dt;
  if (Math.abs(d) <= step) return target;
  return v + Math.sign(d) * step;
}

function callout(s, id, text) {
  const f = s.flight;
  if (f.callouts.includes(id)) return;
  f.callouts.push(id);
  f.lastCallout = text;
  f.calloutT = 3;
  if (!f.sayQueue) f.sayQueue = [];
  f.sayQueue.push(text);
}

export function vSpeeds(s) {
  const td = getScenario(s).toData;
  return {
    v1: s.cdu.v1 || td.v1,
    vr: s.cdu.vr || td.vr,
    v2: s.cdu.v2 || td.v2,
  };
}

// --- user actions (wired to ND buttons / panels) ---
export function canLineUp(s) {
  return s.flight.phase === 'ground' &&
    s.eng.every(e => e.state === 'running') && !s.parkBrk;
}
export function lineUp(s) {
  const sc = getScenario(s);
  const f = s.flight;
  f.phase = 'lineup';
  f.hdg = sc.from.hdg;
  f.pos = 0;
}
export function timeSkip(s) {
  const f = s.flight;
  if (f.phase !== 'cruise') return;
  const tod = todPos(s);
  if (f.pos < tod - 3) f.pos = tod - 3;
}
export function canVacate(s) {
  return s.flight.phase === 'rollout' && s.flight.ias < 30;
}
export function vacate(s) {
  const f = s.flight;
  f.vacated = true;
  f.phase = 'taxiin';
}

export function todPos(s) {
  const sc = getScenario(s);
  // ~3.6 nm per 1000 ft at descent groundspeeds, plus a level segment margin
  return totalDistance(sc) - ((sc.crzFl * 100 - 3000) / 1000) * 3.6 - 8;
}

// ---------------------------------------------------------------- main tick
export function tickFlight(s, d, dt) {
  const sc = getScenario(s);
  const f = s.flight;
  const { v1, vr, v2 } = vSpeeds(s);
  const destElev = sc.to.elev;
  const total = totalDistance(sc);
  const distToThr = total - f.pos;
  const crzAlt = sc.crzFl * 100;

  // gear travel
  f.gearPos = approach(f.gearPos, f.gear ? 1 : 0, 1 / 3, dt);
  f.agl = f.alt - (f.pos < total / 2 ? sc.from.elev : destElev);

  // ---- phase logic ----
  switch (f.phase) {
    case 'ground':
      f.ias = 0; f.gs = 0; f.vs = 0; f.pitch = 0;
      f.n1cmd = null;
      break;

    case 'lineup': {
      f.n1cmd = null;
      if (f.thrust === 'FLX' || f.thrust === 'TOGA') {
        // config check at thrust application (like the real ECAM)
        if (s.flapLever >= 1 && s.flapLever <= 3) {
          f.phase = 'takeoff';
          f.callouts = f.callouts.filter(c => !c.startsWith('to-')); // fresh roll
        } else {
          s.toConfig = 'warning';
          f.thrust = 'IDLE';
        }
      }
      break;
    }

    case 'takeoff': {
      f.n1cmd = f.thrust === 'TOGA' ? 93 : 88;
      if (!f.airborne) {
        f.ias = approach(f.ias, 200, 4.3, dt);
        if (f.ias >= 100) callout(s, 'to-100', 'One hundred');
        if (f.ias >= v1) callout(s, 'to-v1', 'V one');
        if (f.ias >= vr) callout(s, 'to-vr', 'Rotate');
        f.pitch = f.ias >= vr ? approach(f.pitch, 13, 4, dt) : 0;
        if (f.ias >= vr + 3 && f.pitch > 7) f.airborne = true;
      } else {
        f.ias = approach(f.ias, v2 + 10, 1.5, dt);
        f.vs = approach(f.vs, 2400, 800, dt);
        f.alt += f.vs / 60 * dt;
        f.pitch = approach(f.pitch, 14, 2, dt);
        if (f.agl > 80) callout(s, 'to-posclimb', 'Positive climb');
        if (f.agl >= sc.accAlt && f.thrust === 'CLB') f.phase = 'climb';
      }
      break;
    }

    case 'climb': {
      const tgtAlt = Math.min(s.fcu.alt, crzAlt);
      const spd = f.alt < 10000 ? 250 : 290;
      f.ias = approach(f.ias, spd, 1.2, dt);
      f.vs = approach(f.vs, f.alt < tgtAlt - 150 ? 2300 : 0, 900, dt);
      // snap through the last bit of the level-off so we can't stall just
      // below the target while VS decays to zero
      const rate = tgtAlt - f.alt < 200 ? 60 : Math.abs(f.vs) / 60;
      f.alt = approach(f.alt, Math.max(f.alt, tgtAlt), rate, dt);
      f.pitch = approach(f.pitch, f.vs > 500 ? 10 : 3, 2, dt);
      f.n1cmd = f.vs > 500 ? 85 : 65;
      if (f.alt >= crzAlt && s.fcu.alt >= crzAlt) f.phase = 'cruise';
      break;
    }

    case 'cruise': {
      f.ias = approach(f.ias, 290, 1, dt);
      f.vs = 0;
      f.alt = approach(f.alt, crzAlt, 8, dt);
      f.pitch = approach(f.pitch, 2.5, 1, dt);
      f.n1cmd = 78;
      if (s.fcu.alt <= crzAlt - 1000 && f.pos >= todPos(s)) f.phase = 'descent';
      break;
    }

    case 'descent': {
      const tgtAlt = Math.max(s.fcu.alt, 1500);
      const spd = f.alt < 10500 ? 250 : 280;
      f.ias = approach(f.ias, spd, 1.2, dt);
      const descending = f.alt > tgtAlt + 150;
      f.vs = approach(f.vs, descending ? -1900 : 0, 900, dt);
      const rate = f.alt - tgtAlt < 200 ? 60 : Math.abs(f.vs) / 60;
      f.alt = approach(f.alt, tgtAlt, rate, dt);
      f.pitch = approach(f.pitch, descending ? -1.5 : 2, 1.5, dt);
      f.n1cmd = descending ? 35 : 60;
      if (f.appr && distToThr <= 25) { f.phase = 'approach'; f.loc = false; f.gs_cap = false; }
      break;
    }

    case 'approach': {
      // localiser then glideslope capture; speed follows the flap schedule
      if (!f.loc && distToThr <= 22) f.loc = true;
      const glideAlt = destElev + Math.max(0, distToThr) * 318;
      if (!f.gs_cap && distToThr > 0.5 && distToThr <= 15 && glideAlt <= f.alt + 50) f.gs_cap = true;
      const spdByFlap = [210, 190, 170, 160, sc.to.vApp][s.flapLever];
      f.ias = approach(f.ias, spdByFlap, 1.2, dt);
      if (f.gs_cap) {
        f.alt = destElev + Math.max(0, distToThr) * 318;
        f.vs = -Math.round(f.gs * 5.4);      // ~3° at current GS
        f.pitch = approach(f.pitch, s.flapLever >= 3 ? 1 : 0, 1, dt);
      } else {
        f.alt = approach(f.alt, Math.max(s.fcu.alt, 3000), 30, dt);
        f.vs = 0;
      }
      f.n1cmd = 48;
      if (f.gs_cap) {
        if (f.agl <= 1050 && f.agl > 900) callout(s, 'ap-1000', 'One thousand');
        if (f.agl <= 520 && f.agl > 420) callout(s, 'ap-500', 'Five hundred');
        if (f.agl <= 210 && f.agl > 160) callout(s, 'ap-min', 'Minimums');
      }
      if (f.agl <= 40) { f.phase = 'flare'; }
      break;
    }

    case 'flare': {
      callout(s, 'ap-retard', 'Retard');
      f.vs = approach(f.vs, -250, 500, dt);
      f.alt += f.vs / 60 * dt;
      f.pitch = approach(f.pitch, 5, 2, dt);
      f.ias = approach(f.ias, sc.to.vApp - 8, 2, dt);
      f.n1cmd = f.thrust === 'IDLE' ? 25 : 48;
      if (f.alt <= destElev + 1) {
        f.alt = destElev;
        f.vs = 0;
        f.phase = 'rollout';
        f.touchdownAt = f.pos;
        callout(s, 'ap-spoilers', 'Spoilers');
      }
      break;
    }

    case 'rollout': {
      f.pitch = approach(f.pitch, 0, 3, dt);
      const dec = 1.0
        + (f.rev ? 1.9 : 0)
        + ({ LO: 1.0, MED: 1.7, MAX: 2.8 }[s.autoBrk] || 0.4);
      f.ias = Math.max(0, f.ias - dec * dt);
      if (f.ias <= 72) callout(s, 'ro-70', 'Seventy knots');
      f.n1cmd = f.rev ? 72 : 22;
      break;
    }

    case 'taxiin': {
      f.rev = false;
      f.ias = approach(f.ias, 0, 3, dt);
      f.n1cmd = null;
      f.vs = 0; f.pitch = 0;
      break;
    }
  }

  // ---- track / position ----
  if (f.phase !== 'ground' && f.phase !== 'lineup') {
    const tas = f.ias * (1 + f.alt / 1000 * 0.02);
    f.gs = f.airborne || f.phase === 'takeoff' || f.phase === 'rollout' || f.phase === 'taxiin'
      ? tas : 0;
    f.pos += f.gs / 3600 * dt;
    const rp = routePoint(getScenario(s), Math.min(f.pos, total - 0.01));
    // heading: runway heading during roll / final, else leg heading
    if (f.phase === 'takeoff' && f.agl < 400) f.hdg = sc.from.hdg;
    else if (['approach', 'flare', 'rollout', 'taxiin'].includes(f.phase) && (f.loc || f.phase !== 'approach')) f.hdg = sc.to.hdg;
    else f.hdg = approach(f.hdg, rp.hdg, 8, dt);
  }

  // landing gear obstacle: keep flying state consistent
  if (f.phase === 'rollout' || f.phase === 'taxiin') f.airborne = false;

  // passing 10,000 ft on the way down (any descent-side phase)
  if (['descent', 'approach'].includes(f.phase) && f.alt < 10300 && f.vs < -50) {
    callout(s, 'des-10k', 'Ten thousand');
  }

  // ---- FMA ----
  updateFma(s, sc, f);

  if (f.calloutT > 0) f.calloutT -= dt;
}

function updateFma(s, sc, f) {
  const lvrClbWanted = f.airborne && f.agl >= sc.thrRedAlt &&
    (f.thrust === 'FLX' || f.thrust === 'TOGA');
  let thr = '', vert = '', lat = '';
  switch (f.phase) {
    case 'takeoff':
      thr = lvrClbWanted ? 'LVR CLB' : f.thrust === 'TOGA' ? 'MAN TOGA' : 'MAN FLX +' + (s.cdu.flex || 55);
      vert = 'SRS';
      lat = f.agl < 400 ? 'RWY' : 'NAV';
      break;
    case 'climb':
      thr = 'THR CLB';
      vert = f.vs > 300 ? 'CLB' : 'ALT';
      lat = 'NAV';
      break;
    case 'cruise':
      thr = 'SPEED'; vert = 'ALT CRZ'; lat = 'NAV';
      break;
    case 'descent':
      thr = f.vs < -300 ? 'THR IDLE' : 'SPEED';
      vert = f.vs < -300 ? 'DES' : 'ALT';
      lat = 'NAV';
      break;
    case 'approach':
      thr = 'SPEED';
      vert = f.gs_cap ? 'G/S' : 'ALT';
      lat = f.loc ? 'LOC' : 'NAV';
      break;
    case 'flare':
      thr = f.thrust === 'IDLE' ? 'THR IDLE' : 'SPEED';
      vert = 'FLARE'; lat = 'LAND';
      break;
    case 'rollout':
      thr = f.rev ? 'REV' : '';
      vert = 'ROLL OUT'; lat = 'ROLL OUT';
      break;
    default:
      thr = ''; vert = ''; lat = '';
  }
  f.fma = { thr, vert, lat, lvrClb: lvrClbWanted };
}
