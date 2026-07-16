// MCDU key handling. Runs in the main window (owner of the state); the CDU
// window only sends key ids.
import { findScenarioByRoute, getScenario } from './navdata.js';

const CHAR_KEYS = /^[A-Z0-9/.+\-]$/;

export function handleCduKey(s, key) {
  const c = s.cdu;
  if (key === 'CLR') {
    if (c.msg) c.msg = null;
    else c.scratch = c.scratch.slice(0, -1);
    return;
  }
  if (key === 'SP') { c.scratch += ' '; return; }
  if (CHAR_KEYS.test(key)) {
    if (c.scratch.length < 22) c.scratch += key;
    return;
  }
  switch (key) {
    case 'MENU': c.page = 'MENU'; return;
    case 'INIT': c.page = 'INIT'; return;
    case 'PERF': c.page = 'PERF'; return;
    case 'FPLN': c.page = 'FPLN'; return;
    case 'DATA': c.page = 'STATUS'; return;
    case 'LEFT': case 'RIGHT': // slew between INIT A <-> INIT B
      if (c.page === 'INIT') c.page = 'INITB';
      else if (c.page === 'INITB') c.page = 'INIT';
      return;
    case 'UP': case 'DOWN': return;
    case 'PROG': case 'RAD':
    case 'DIR': case 'FUEL': case 'SEC': case 'ATC': case 'AIRPORT':
      c.msg = 'NOT ALLOWED'; return;
  }
  if (key.startsWith('LSK')) { handleLsk(s, key); }
}

function handleLsk(s, key) {
  const c = s.cdu;
  if (c.page === 'MENU') {
    if (key === 'LSK1L') { c.page = 'INIT'; }
    else c.msg = 'SELECT DESIRED SYSTEM';
    return;
  }
  if (c.page === 'INIT') {
    switch (key) {
      case 'LSK1R': { // FROM/TO — must match a stored scenario (company route)
        const m = c.scratch.match(/^([A-Z]{4})\/([A-Z]{4})$/);
        if (!m) { c.msg = 'FORMAT ERROR'; return; }
        const sc = findScenarioByRoute(m[1], m[2]);
        if (!sc) { c.msg = 'NOT IN DATA BASE'; return; }
        s.gnd.scenario = sc.id;
        c.from = m[1]; c.to = m[2]; c.scratch = '';
        return;
      }
      case 'LSK3L': { // FLT NBR
        if (/^[A-Z0-9]{2,8}$/.test(c.scratch)) { c.fltNbr = c.scratch; c.scratch = ''; }
        else c.msg = 'FORMAT ERROR';
        return;
      }
      case 'LSK5L': { // COST INDEX
        if (/^\d{1,3}$/.test(c.scratch)) { c.ci = c.scratch; c.scratch = ''; }
        else c.msg = 'FORMAT ERROR';
        return;
      }
      case 'LSK6L': { // CRZ FL
        const m = c.scratch.match(/^(?:FL)?(\d{2,3})$/);
        if (m) { c.crzFl = 'FL' + m[1].padStart(3, '0'); c.scratch = ''; }
        else c.msg = 'FORMAT ERROR';
        return;
      }
      case 'LSK3R': { // ALIGN IRS -> complete alignment instantly
        let any = false;
        for (const ir of s.adirs) {
          if (ir.sel !== 'OFF' && !ir.aligned) { ir.aligned = true; ir.align = 999; any = true; }
        }
        if (!any) c.msg = 'NOT ALLOWED';
        return;
      }
    }
    c.msg = 'NOT ALLOWED';
    return;
  }
  if (c.page === 'INITB') {
    switch (key) {
      case 'LSK1R': { // ZFW/ZFWCG
        const m = c.scratch.match(/^(\d{2}(?:\.\d)?)\/(\d{2}(?:\.\d)?)$/);
        if (m && +m[1] >= 35 && +m[1] <= 80 && +m[2] >= 15 && +m[2] <= 45) {
          c.zfw = +m[1]; c.zfwcg = +m[2]; c.scratch = '';
        } else c.msg = 'FORMAT ERROR';
        return;
      }
      case 'LSK2R': { // BLOCK
        const m = c.scratch.match(/^(\d{1,2}(?:\.\d)?)$/);
        if (m && +m[1] >= 1 && +m[1] <= 25) { c.block = +m[1]; c.scratch = ''; }
        else c.msg = 'FORMAT ERROR';
        return;
      }
    }
    c.msg = 'NOT ALLOWED';
    return;
  }
  if (c.page === 'PERF') {
    const num3 = /^\d{3}$/;
    switch (key) {
      case 'LSK1L':
        if (num3.test(c.scratch) && +c.scratch >= 100 && +c.scratch <= 180) { c.v1 = +c.scratch; c.scratch = ''; }
        else c.msg = 'FORMAT ERROR';
        return;
      case 'LSK2L':
        if (num3.test(c.scratch) && +c.scratch >= (c.v1 || 100) && +c.scratch <= 185) { c.vr = +c.scratch; c.scratch = ''; }
        else c.msg = c.v1 && num3.test(c.scratch) ? 'VR MUST BE ≥ V1' : 'FORMAT ERROR';
        return;
      case 'LSK3L':
        if (num3.test(c.scratch) && +c.scratch >= (c.vr || 100) && +c.scratch <= 190) { c.v2 = +c.scratch; c.scratch = ''; }
        else c.msg = c.vr && num3.test(c.scratch) ? 'V2 MUST BE ≥ VR' : 'FORMAT ERROR';
        return;
      case 'LSK4L': { // TRANS ALT
        const m = c.scratch.match(/^(\d{4,5})$/);
        if (m && +m[1] >= 2000 && +m[1] <= 18000) { c.transAlt = +m[1]; c.scratch = ''; }
        else c.msg = 'FORMAT ERROR';
        return;
      }
      case 'LSK3R': { // FLAPS/THS
        const m = c.scratch.match(/^([1-3])(\/(UP|DN)\d(\.\d)?)?$/);
        if (m) { c.flapsThs = m[2] ? c.scratch : `${m[1]}/UP0.5`; c.scratch = ''; }
        else c.msg = 'FORMAT ERROR';
        return;
      }
      case 'LSK4R': { // FLEX TEMP
        const m = c.scratch.match(/^(\d{2})$/);
        if (m && +m[1] >= 30 && +m[1] <= 70) { c.flex = +m[1]; c.scratch = ''; }
        else c.msg = 'FORMAT ERROR';
        return;
      }
    }
    c.msg = 'NOT ALLOWED';
    return;
  }
  if (c.page === 'FPLN') {
    if (!c.from) { c.msg = 'INIT FROM/TO FIRST'; return; }
    if (key === 'LSK1L') { c.page = 'DEPARTURE'; c.tmpy = null; return; }
    if (key === 'LSK6L') { c.page = 'ARRIVAL'; c.tmpy = null; return; }
    c.msg = 'NOT ALLOWED';
    return;
  }
  if (c.page === 'DEPARTURE') {
    const sc = getScenario(s);
    if (key === 'LSK1L') { c.tmpy = { ...(c.tmpy || {}), rwy: sc.from.rwy }; return; }
    if (key === 'LSK2L') {
      if (!c.tmpy || !c.tmpy.rwy) { c.msg = 'SELECT RWY FIRST'; return; }
      c.tmpy.sid = sc.from.sid;
      return;
    }
    if (key === 'LSK6R') { // INSERT
      if (c.tmpy && c.tmpy.rwy && c.tmpy.sid) {
        c.dep = c.tmpy; c.tmpy = null; c.page = 'FPLN';
      } else c.msg = 'SELECT RWY AND SID';
      return;
    }
    if (key === 'LSK6L') { c.tmpy = null; c.page = 'FPLN'; return; } // RETURN
    c.msg = 'NOT ALLOWED';
    return;
  }
  if (c.page === 'ARRIVAL') {
    const sc = getScenario(s);
    if (key === 'LSK1L') { c.tmpy = { ...(c.tmpy || {}), appr: sc.to.appr }; return; }
    if (key === 'LSK2L') {
      if (!c.tmpy || !c.tmpy.appr) { c.msg = 'SELECT APPR FIRST'; return; }
      c.tmpy.star = sc.to.star;
      return;
    }
    if (key === 'LSK6R') { // INSERT
      if (c.tmpy && c.tmpy.appr && c.tmpy.star) {
        c.arr = c.tmpy; c.tmpy = null; c.page = 'FPLN';
      } else c.msg = 'SELECT APPR AND STAR';
      return;
    }
    if (key === 'LSK6L') { c.tmpy = null; c.page = 'FPLN'; return; } // RETURN
    c.msg = 'NOT ALLOWED';
    return;
  }
  if (c.page === 'STATUS') c.msg = 'NOT ALLOWED';
}
