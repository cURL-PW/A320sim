// Builds the 14-line MCDU screen content from a state snapshot.
// Line = array of segments { t, cls, pos: 'l'|'c'|'r' }.
// Rows: 0 title, 1..12 alternating label/data for LSK 1-6, 13 scratchpad.
import { getScenario } from './navdata.js';

export function renderCdu(s, d) {
  const rows = Array.from({ length: 14 }, () => []);
  const seg = (r, t, cls, pos = 'l') => rows[r].push({ t, cls, pos });

  if (!d.screensOn) return rows; // dark screen

  const c = s.cdu;
  if (c.page === 'MENU') {
    seg(0, 'MCDU MENU', 'w', 'c');
    seg(2, '<FMGC', 'g');
    seg(4, '<ATSU', 'w');
    seg(6, '<AIDS', 'w');
    seg(8, '<CFDS', 'w');
    seg(12, 'RETURN>', 'w', 'r');
  } else if (c.page === 'INIT') {
    seg(0, 'INIT', 'w', 'c'); seg(0, '→', 'w', 'r');
    seg(1, 'CO RTE', 'label'); seg(1, 'FROM/TO', 'label', 'r');
    seg(2, '__________', 'a');
    seg(2, c.from ? `${c.from}/${c.to}` : '____/____', c.from ? 'c-col' : 'a', 'r');
    seg(3, 'ALTN/CO RTE', 'label');
    seg(4, '----/----------', 'w');
    const aligning = s.adirs.some(ir => ir.sel !== 'OFF' && !ir.aligned);
    if (aligning) { seg(3, 'ALIGN', 'label', 'r'); seg(4, 'IRS>', 'c-col', 'r'); }
    seg(5, 'FLT NBR', 'label');
    seg(6, c.fltNbr || '________', c.fltNbr ? 'c-col' : 'a');
    seg(8, 'LAT', 'label'); seg(8, 'LONG', 'label', 'r');
    seg(8, '3534.6N/13946.4E', 'label', 'c');
    seg(9, 'COST INDEX', 'label');
    seg(10, c.ci || '___', c.ci ? 'c-col' : 'a');
    seg(11, 'CRZ FL/TEMP', 'label');
    seg(12, (c.crzFl || '_____') + ' /-47°', c.crzFl ? 'c-col' : 'a');
    seg(11, 'TROPO', 'label', 'r');
    seg(12, '36090', 'c-col', 'r');
  } else if (c.page === 'INITB') {
    seg(0, 'INIT B', 'w', 'c'); seg(0, '←', 'w', 'l');
    seg(1, 'TAXI', 'label'); seg(1, 'ZFW /ZFWCG', 'label', 'r');
    seg(2, '0.4', 'c-col');
    seg(2, c.zfw ? `${c.zfw.toFixed(1)}/${c.zfwcg.toFixed(1)}` : '___._/__._', c.zfw ? 'c-col' : 'a', 'r');
    seg(3, 'TRIP /TIME', 'label'); seg(3, 'BLOCK', 'label', 'r');
    if (c.zfw && c.block) seg(4, '1.9/0045', 'g');
    seg(4, c.block ? c.block.toFixed(1) : '__._', c.block ? 'c-col' : 'a', 'r');
    seg(5, 'RTE RSV/%', 'label');
    seg(6, c.block ? '0.1/5.0' : '---/-.-', c.block ? 'g' : 'w');
    seg(7, 'ALTN', 'label'); seg(7, 'TOW', 'label', 'r');
    seg(8, '0.4', 'g');
    seg(8, c.zfw && c.block ? (c.zfw + c.block).toFixed(1) : '---.-', c.zfw && c.block ? 'g' : 'w', 'r');
    seg(9, 'FINAL/TIME', 'label'); seg(9, 'LW', 'label', 'r');
    seg(10, '0.9/0030', 'g');
    seg(10, c.zfw && c.block ? (c.zfw + c.block - 1.9).toFixed(1) : '---.-', c.zfw && c.block ? 'g' : 'w', 'r');
    seg(11, 'EXTRA/TIME', 'label');
    seg(12, c.block ? '1.2/0100' : '---/----', c.block ? 'g' : 'w');
  } else if (c.page === 'PERF') {
    seg(0, 'TAKE OFF', 'w', 'c');
    seg(1, 'V1', 'label'); seg(1, 'RWY', 'label', 'r');
    seg(2, c.v1 ? String(c.v1) : '___', c.v1 ? 'c-col' : 'a');
    seg(2, c.dep ? c.dep.rwy : '---', 'g', 'r');
    seg(3, 'VR', 'label'); seg(3, 'TO SHIFT', 'label', 'r');
    seg(4, c.vr ? String(c.vr) : '___', c.vr ? 'c-col' : 'a');
    seg(4, '----', 'w', 'r');
    seg(5, 'V2', 'label'); seg(5, 'FLAPS/THS', 'label', 'r');
    seg(6, c.v2 ? String(c.v2) : '___', c.v2 ? 'c-col' : 'a');
    seg(6, c.flapsThs || '_/____', c.flapsThs ? 'c-col' : 'a', 'r');
    seg(7, 'TRANS ALT', 'label'); seg(7, 'FLEX TO TEMP', 'label', 'r');
    seg(8, c.transAlt ? String(c.transAlt) : '_____', c.transAlt ? 'c-col' : 'a');
    seg(8, c.flex ? `${c.flex}°` : '__°', c.flex ? 'c-col' : 'a', 'r');
    seg(9, 'THR RED/ACC', 'label');
    seg(10, '1500/1500', 'c-col');
    seg(11, 'UPLINK', 'label'); seg(11, 'NEXT', 'label', 'r');
    seg(12, '<TO DATA', 'w'); seg(12, 'PHASE>', 'w', 'r');
  } else if (c.page === 'FPLN') {
    const sc = getScenario(s);
    seg(0, c.fltNbr || 'F-PLN', 'w', 'c');
    if (!c.from) {
      seg(2, '------END OF F-PLN------', 'w', 'c');
    } else {
      seg(1, 'FROM', 'label'); seg(1, 'TIME  SPD/ALT', 'label', 'r');
      seg(2, `${c.from}${c.dep ? c.dep.rwy : ''}`, 'g');
      seg(2, c.dep ? `---- 000/${sc.from.elev}` : '<SEL DEPARTURE', c.dep ? 'g' : 'a', 'r');
      if (c.dep) {
        seg(4, sc.route[1].id, 'g'); seg(3, c.dep.sid, 'label');
        const mid = sc.route.slice(2, -2).map(w => w.id).join('  ');
        seg(6, mid, 'g');
        seg(8, sc.route[sc.route.length - 2].id, 'g');
        if (c.arr) seg(7, c.arr.star, 'label');
      }
      seg(11, 'DEST', 'label');
      seg(12, `${c.to}${c.arr ? sc.to.rwy : ''}`, 'g');
      seg(12, c.arr ? c.arr.appr : '<SEL ARRIVAL', c.arr ? 'g' : 'a', 'r');
    }
  } else if (c.page === 'DEPARTURE') {
    const sc = getScenario(s);
    seg(0, `DEPARTURE ${c.from}`, 'w', 'c');
    seg(1, 'RWY', 'label');
    seg(2, `${c.tmpy && c.tmpy.rwy ? ' ' : '<'}${sc.from.rwy}`, c.tmpy && c.tmpy.rwy ? 'c-col' : 'w');
    seg(3, 'SID', 'label');
    seg(4, `${c.tmpy && c.tmpy.sid ? ' ' : '<'}${sc.from.sid}`, c.tmpy && c.tmpy.sid ? 'c-col' : 'w');
    seg(11, '', 'label');
    seg(12, '<RETURN', 'w');
    if (c.tmpy && c.tmpy.rwy && c.tmpy.sid) seg(12, 'INSERT*', 'a', 'r');
  } else if (c.page === 'ARRIVAL') {
    const sc = getScenario(s);
    seg(0, `ARRIVAL ${c.to}`, 'w', 'c');
    seg(1, 'APPR', 'label');
    seg(2, `${c.tmpy && c.tmpy.appr ? ' ' : '<'}${sc.to.appr} ${sc.to.ilsFreq}`, c.tmpy && c.tmpy.appr ? 'c-col' : 'w');
    seg(3, 'STAR', 'label');
    seg(4, `${c.tmpy && c.tmpy.star ? ' ' : '<'}${sc.to.star}`, c.tmpy && c.tmpy.star ? 'c-col' : 'w');
    seg(11, '', 'label');
    seg(12, '<RETURN', 'w');
    if (c.tmpy && c.tmpy.appr && c.tmpy.star) seg(12, 'INSERT*', 'a', 'r');
  } else if (c.page === 'STATUS') {
    seg(0, 'A320-214', 'w', 'c');
    seg(1, 'ENG', 'label');
    seg(2, 'CFM56-5B4', 'g');
    seg(3, 'ACTIVE NAV DATA BASE', 'label');
    seg(4, '13JUL-9AUG', 'c-col'); seg(4, 'AIRAC', 'g', 'r');
    seg(5, 'SECOND NAV DATA BASE', 'label');
    seg(6, '15JUN-12JUL', 'label');
    seg(11, 'IDLE/PERF', 'label');
    seg(12, '+0.0/+0.0', 'g');
  }

  // scratchpad
  seg(13, c.msg || c.scratch, c.msg ? 'w' : 'w');
  return rows;
}
