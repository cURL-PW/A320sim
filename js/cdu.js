// CDU window entry: thin client. Renders snapshots from the main window and
// sends key presses back.
import { derive } from './model.js';
import { renderCdu } from './cdu_render.js';
import { openChannel } from './sync.js';

const screen = document.getElementById('cdu-screen');
const overlay = document.getElementById('cdu-overlay');

let lastStateAt = 0;

const channel = openChannel(msg => {
  if (msg.type === 'state') {
    lastStateAt = Date.now();
    draw(msg.state);
  }
});
channel.send({ type: 'hello' });

// no snapshot yet / main window gone -> show hint
setInterval(() => {
  overlay.style.display = Date.now() - lastStateAt > 2000 ? 'flex' : 'none';
}, 500);

function draw(s) {
  const d = derive(s);
  const rows = renderCdu(s, d);
  screen.replaceChildren();
  rows.forEach((segs, i) => {
    const line = document.createElement('div');
    line.className = 'cdu-line ' + (i === 0 ? 'cdu-title' : i === 13 ? 'cdu-scratch' : i % 2 ? 'cdu-label' : 'cdu-data');
    for (const pos of ['l', 'c', 'r']) {
      const span = document.createElement('span');
      span.className = 'cdu-' + pos;
      for (const seg of segs.filter(x => x.pos === pos)) {
        const t = document.createElement('span');
        t.className = 'col-' + seg.cls;
        t.textContent = seg.t;
        span.appendChild(t);
      }
      line.appendChild(span);
    }
    screen.appendChild(line);
  });
}

// --- keyboard ---
function key(k) { channel.send({ type: 'cduKey', key: k }); }

const kb = document.getElementById('cdu-keys');

function addKey(parent, label, k, cls = '') {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'cdu-key ' + cls;
  b.textContent = label;
  b.addEventListener('click', () => key(k));
  parent.appendChild(b);
  return b;
}

// LSK columns are positioned next to the screen via CSS grid in cdu.html.
for (let i = 1; i <= 6; i++) addKey(document.getElementById('lsk-l'), '–', `LSK${i}L`, 'lsk');
for (let i = 1; i <= 6; i++) addKey(document.getElementById('lsk-r'), '–', `LSK${i}R`, 'lsk');

const PAGE_KEYS = [
  ['DIR', 'DIR'], ['PROG', 'PROG'], ['PERF', 'PERF'], ['INIT', 'INIT'], ['DATA', 'DATA'],
  ['F-PLN', 'FPLN'], ['RAD NAV', 'RAD'], ['FUEL PRED', 'FUEL'], ['SEC F-PLN', 'SEC'], ['MCDU MENU', 'MENU'],
];
const pageRow = document.getElementById('cdu-pagekeys');
for (const [label, k] of PAGE_KEYS) addKey(pageRow, label, k, 'page');

const ROWS = ['ABCDE', 'FGHIJ', 'KLMNO', 'PQRST', 'UVWXY'];
for (const row of ROWS) {
  for (const ch of row) addKey(kb, ch, ch);
}
addKey(kb, 'Z', 'Z');
addKey(kb, '/', '/');
addKey(kb, 'SP', 'SP');
addKey(kb, 'CLR', 'CLR', 'clr');
addKey(kb, 'Δ', 'OVFY', 'ovfy');

const numRow = document.getElementById('cdu-numkeys');
for (const ch of '123456789.0-') addKey(numRow, ch === '-' ? '+/-' : ch, ch);
