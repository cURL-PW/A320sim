// Main window entry: owns the state, runs the simulation, broadcasts snapshots.
import { coldAndDark, derive } from './model.js';
import { tick } from './sim.js';
import { openChannel } from './sync.js';
import { buildOverhead } from './panels/overhead.js';
import { buildPedestal } from './panels/pedestal.js';
import { buildFcu } from './panels/fcu.js';
import { buildEwd, buildSd } from './ecam.js';
import { buildChecklist, tickChecklist, currentPhase } from './checklist.js';
import { handleCduKey } from './cdu_logic.js';

let state = coldAndDark();

const act = {
  state: () => state,
  do(fn) { fn(state); refresh(); },
};

const channel = openChannel(msg => {
  if (msg.type === 'hello') broadcast();
  else if (msg.type === 'cduKey') { handleCduKey(state, msg.key); refresh(); }
});

function broadcast() {
  channel.send({ type: 'state', state });
}

// --- build UI ---
const overhead = buildOverhead(document.getElementById('overhead-body'), act);
const pedestal = buildPedestal(document.getElementById('pedestal-body'), act);
const fcu = buildFcu(document.getElementById('fcu-body'), act);
const ewd = buildEwd(document.getElementById('ewd'));
const sd = buildSd(document.getElementById('sd'), act);
const checklist = buildChecklist(document.getElementById('checklist-body'), act);

const phaseEl = document.getElementById('phase');
const drawer = document.getElementById('checklist');

document.getElementById('btn-checklist').addEventListener('click', () => {
  drawer.classList.toggle('open');
});
document.getElementById('btn-ck-close').addEventListener('click', () => {
  drawer.classList.remove('open');
});
document.getElementById('btn-cdu').addEventListener('click', () => {
  window.open('cdu.html', 'a320cdu', 'width=420,height=640');
});
document.getElementById('btn-reset').addEventListener('click', () => {
  if (confirm('Cold & Dark 状態にリセットします。よろしいですか?')) {
    state = coldAndDark();
    refresh();
  }
});

function refresh() {
  const d = derive(state);
  overhead.update(state, d);
  pedestal.update(state, d);
  fcu.update(state, d);
  ewd.update(state, d);
  sd.update(state, d);
  checklist.update(state);
  const ph = currentPhase(state);
  phaseEl.textContent = ph ? ph.title : 'FLOW COMPLETE';
  broadcast();
}

// --- simulation loop ---
// ?speed=N accelerates the simulation (practice / testing aid)
const speed = Math.max(0.1, Number(new URLSearchParams(location.search).get('speed')) || 1);
let last = performance.now();
setInterval(() => {
  const now = performance.now();
  const dt = Math.min(1, (now - last) / 1000); // clamp when tab was throttled
  last = now;
  tick(state, dt * speed);
  tickChecklist(state);
  refresh();
}, 100);

refresh();

// test/debug hook
window.__state = () => state;
