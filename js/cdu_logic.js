// MCDU key handling. Runs in the main window (owner of the state); the CDU
// window only sends key ids.

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
    case 'DATA': c.page = 'STATUS'; return;
    case 'FPLN': case 'PERF': case 'PROG': case 'RAD':
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
      case 'LSK1R': { // FROM/TO
        const m = c.scratch.match(/^([A-Z]{4})\/([A-Z]{4})$/);
        if (m) { c.from = m[1]; c.to = m[2]; c.scratch = ''; }
        else c.msg = 'FORMAT ERROR';
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
  if (c.page === 'STATUS') c.msg = 'NOT ALLOWED';
}
