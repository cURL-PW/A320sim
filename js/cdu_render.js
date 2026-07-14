// Builds the 14-line MCDU screen content from a state snapshot.
// Line = array of segments { t, cls, pos: 'l'|'c'|'r' }.
// Rows: 0 title, 1..12 alternating label/data for LSK 1-6, 13 scratchpad.

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
    seg(0, 'INIT', 'w', 'c');
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
