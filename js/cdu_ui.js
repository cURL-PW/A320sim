// Shared MCDU unit: builds screen + keyboard DOM and renders snapshots.
// Used by the in-app popup (keys handled directly) and by cdu.html
// (keys sent over BroadcastChannel).
import { derive } from './model.js';
import { renderCdu } from './cdu_render.js';

export function buildCduUnit(root, onKey) {
  root.innerHTML = '';
  const unit = div(root, 'cdu-unit');

  const top = div(unit, 'cdu-top');
  const lskL = div(top, 'lsk-col lsk-l');
  const wrap = div(top, 'cdu-screenwrap');
  const screen = div(wrap, 'cdu-screen');
  const overlay = div(wrap, 'cdu-overlay');
  overlay.style.display = 'none';
  overlay.innerHTML = '<p>メイン窓が見つかりません</p>' +
    '<p class="hint">メインパネル(index.html)を同じブラウザで開いてください。<br>' +
    '同期には HTTP 配信(同一オリジン)が必要です。</p>';
  const lskR = div(top, 'lsk-col lsk-r');

  const pageRow = div(unit, 'cdu-pagekeys');
  const slewRow = div(unit, 'cdu-slewkeys');
  const numRow = div(unit, 'cdu-numkeys');
  const kb = div(unit, 'cdu-keys');

  const addKey = (parent, label, k, cls = '') => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'cdu-key ' + cls;
    b.textContent = label;
    b.addEventListener('click', () => onKey(k));
    parent.appendChild(b);
    return b;
  };

  for (let i = 1; i <= 6; i++) addKey(lskL, '–', `LSK${i}L`, 'lsk');
  for (let i = 1; i <= 6; i++) addKey(lskR, '–', `LSK${i}R`, 'lsk');

  const PAGE_KEYS = [
    ['DIR', 'DIR'], ['PROG', 'PROG'], ['PERF', 'PERF'], ['INIT', 'INIT'], ['DATA', 'DATA'],
    ['F-PLN', 'FPLN'], ['RAD NAV', 'RAD'], ['FUEL PRED', 'FUEL'], ['SEC F-PLN', 'SEC'], ['MCDU MENU', 'MENU'],
  ];
  for (const [label, k] of PAGE_KEYS) addKey(pageRow, label, k, 'page');
  for (const [label, k] of [['←', 'LEFT'], ['↑', 'UP'], ['↓', 'DOWN'], ['→', 'RIGHT']]) {
    addKey(slewRow, label, k, 'slew');
  }
  for (const ch of '123456789.0-') addKey(numRow, ch === '-' ? '+/-' : ch, ch);
  for (const row of ['ABCDE', 'FGHIJ', 'KLMNO', 'PQRST', 'UVWXY']) {
    for (const ch of row) addKey(kb, ch, ch);
  }
  addKey(kb, 'Z', 'Z');
  addKey(kb, '/', '/');
  addKey(kb, 'SP', 'SP');
  addKey(kb, 'CLR', 'CLR', 'clr');
  addKey(kb, 'Δ', 'OVFY', 'ovfy');

  return {
    overlay,
    draw(s) {
      const d = derive(s);
      const rows = renderCdu(s, d);
      screen.replaceChildren();
      rows.forEach((segs, i) => {
        const line = document.createElement('div');
        line.className = 'cdu-line ' +
          (i === 0 ? 'cdu-title' : i === 13 ? 'cdu-scratch' : i % 2 ? 'cdu-label' : 'cdu-data');
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
    },
  };
}

function div(parent, cls) {
  const el = document.createElement('div');
  el.className = cls;
  parent.appendChild(el);
  return el;
}
