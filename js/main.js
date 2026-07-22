// Main window entry: owns the state, runs the simulation, broadcasts snapshots.
import { coldAndDark, turnAround, restoreState, derive, SCHEMA_VERSION, STORAGE_KEY } from './model.js';
import { tick } from './sim.js';
import { openChannel } from './sync.js';
import { buildOverhead } from './panels/overhead.js';
import { buildPedestal } from './panels/pedestal.js';
import { buildFcu } from './panels/fcu.js';
import { buildEwd, buildSd } from './ecam.js';
import { buildPfd } from './pfd.js';
import { buildNd } from './nd.js';
import { buildChecklist, tickChecklist, currentPhase, activeItem, progress } from './checklist.js';
import { handleCduKey } from './cdu_logic.js';
import { buildCduUnit } from './cdu_ui.js';
import { createSound } from './sound.js';
import { helpFor, buildHelpPopover } from './help.js';

let state = loadState() || coldAndDark();

// --- persistence (survives reload / Safari tab eviction) ---
function loadState() {
  try { return restoreState(JSON.parse(localStorage.getItem(STORAGE_KEY))); }
  catch { return null; }
}
function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: SCHEMA_VERSION, state })); }
  catch { /* private mode / quota — persistence is best-effort */ }
}
setInterval(saveState, 2000);
document.addEventListener('visibilitychange', () => { if (document.hidden) saveState(); });

const sound = createSound();
document.addEventListener('pointerdown', () => sound.ensure(), { capture: true });

const act = {
  state: () => state,
  do(fn) {
    sound.click();
    if (state.exam && !state.exam.result) {
      state.exam.started = true;
      state.exam.ops++;
    }
    fn(state);
    refresh();
  },
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
const pfd = buildPfd(document.getElementById('pfd'));
const nd = buildNd(document.getElementById('nd'), act);
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
// CDU opens as an in-app popup (works in the PWA where window.open cannot);
// a separate window stays available via the ↗ link for Split View users.
const cduPopup = document.getElementById('cdu-popup');
let cduUnit = null;
document.getElementById('btn-cdu').addEventListener('click', () => {
  if (!cduUnit) {
    cduUnit = buildCduUnit(document.getElementById('cdu-popup-body'),
      key => act.do(s => handleCduKey(s, key)));
  }
  cduPopup.classList.toggle('open');
  refresh();
});
document.getElementById('cdu-popup-close').addEventListener('click', () => {
  cduPopup.classList.remove('open');
});
document.getElementById('cdu-popup-ext').addEventListener('click', () => {
  window.open('cdu.html', 'a320cdu', 'width=420,height=640');
});
document.getElementById('btn-reset').addEventListener('click', () => {
  if (confirm('Cold & Dark 状態にリセットします。よろしいですか?')) {
    state = coldAndDark();
    saveState();
    refresh();
  }
});
const stateSel = document.getElementById('state-sel');
stateSel.addEventListener('change', () => {
  const v = stateSel.value;
  stateSel.value = '';
  if (v === 'colddark' && confirm('Cold & Dark 状態から開始します。よろしいですか?')) {
    state = coldAndDark();
  } else if (v === 'turnaround' && confirm('ターンアラウンド状態(外部電源・ADIRS アライン済み)から開始します。よろしいですか?')) {
    state = turnAround();
  } else return;
  saveState();
  refresh();
});

// --- help mode (tap a control to read what it does) + guide highlight ---
const helpPop = buildHelpPopover();
let helpMode = false;
let guideOn = true;
const helpBtn = document.getElementById('btn-help');
const guideBtn = document.getElementById('btn-guide');
helpBtn.addEventListener('click', () => {
  helpMode = !helpMode;
  document.body.classList.toggle('help-mode', helpMode);
  helpBtn.classList.toggle('active', helpMode);
  if (!helpMode) helpPop.hide();
  refresh();
});
guideBtn.addEventListener('click', () => {
  guideOn = !guideOn;
  guideBtn.classList.toggle('active', guideOn);
  refresh();
});
guideBtn.classList.toggle('active', guideOn);
// In help mode, intercept taps on controls to show a description instead of
// actuating them. Capture phase so it runs before the widget's own handler.
document.addEventListener('click', ev => {
  if (!helpMode) return;
  if (ev.target.closest('#topbar') || ev.target.closest('#help-popover')) return;
  const info = helpFor(ev.target);
  ev.preventDefault();
  ev.stopPropagation();
  if (info) helpPop.show(info.title, info.text);
  else helpPop.show('—', 'この操作の説明はまだ用意されていません。');
}, true);

let guideEls = [];
function updateGuide() {
  for (const el of guideEls) el.classList.remove('guide-hl');
  guideEls = [];
  if (!guideOn || helpMode || state.exam) return;
  const active = activeItem(state);
  if (!active || !active.target) return;
  let el = null;
  const t = active.target;
  if (t[0] === '#' || t[0] === '.' || t[0] === '[') el = document.querySelector(t);
  else {
    for (const lbl of document.querySelectorAll('.ctl-label')) {
      if (lbl.textContent.trim() === t) { el = lbl.closest('.ctl'); break; }
    }
  }
  if (el && el.offsetParent !== null) { el.classList.add('guide-hl'); guideEls.push(el); }
}

// --- exam mode: hide the checklist, time the flow, grade at the end ---
const EXAM_PAR = { GROUND: 85, FULL: 130 };
const parOps = () => EXAM_PAR[state.gnd.program] || EXAM_PAR.FULL;
const examBtn = document.getElementById('btn-exam');
const examStatus = document.getElementById('exam-status');
const examResult = document.getElementById('exam-result');
examBtn.addEventListener('click', () => {
  if (state.exam) {
    if (confirm('試験モードを中止して手順ガイドに戻りますか?')) { state.exam = null; refresh(); }
    return;
  }
  if (!confirm('試験モード: チェックリストを隠して Cold & Dark から全手順を実施します。\n所要時間・操作数・警告発生数で採点されます。開始しますか?')) return;
  const program = state.gnd.program;
  state = coldAndDark();
  state.gnd.program = program;
  state.exam = { started: false, time: 0, ops: 0, alerts: 0, result: null };
  saveState();
  refresh();
});
document.getElementById('exam-close').addEventListener('click', () => {
  state.exam = null;
  refresh();
});

function gradeExam(e) {
  const ratio = e.ops / parOps();
  if (e.alerts === 0 && ratio <= 1.1) return 'S';
  if (e.alerts <= 1 && ratio <= 1.3) return 'A';
  if (e.alerts <= 3 && ratio <= 1.6) return 'B';
  return 'C';
}

function fmtTime(sec) {
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}
const sndBtn = document.getElementById('btn-sound');
sndBtn.addEventListener('click', () => {
  sound.setMuted(!sound.muted);
  sndBtn.textContent = sound.muted ? '🔇' : '🔊';
});

let prevAckCaut = true;
function refresh() {
  const d = derive(state);
  overhead.update(state, d);
  pedestal.update(state, d);
  fcu.update(state, d);
  pfd.update(state, d);
  nd.update(state, d);
  document.getElementById('flightdeck').style.display =
    state.gnd.program === 'FULL' ? '' : 'none';

  if (cduUnit && cduPopup.classList.contains('open')) cduUnit.draw(state);

  // speak queued flight callouts
  const q = state.flight.sayQueue;
  if (q && q.length) {
    for (const text of q.splice(0)) sound.say(text);
  }
  ewd.update(state, d);
  sd.update(state, d);
  checklist.update(state);
  updateGuide();
  const ph = currentPhase(state);
  phaseEl.textContent = ph ? ph.title : 'FLOW COMPLETE';

  // exam mode presentation + completion
  const exam = state.exam;
  drawer.classList.toggle('exam', !!exam);
  examBtn.textContent = exam ? 'EXAM中止' : 'EXAM';
  if (exam) {
    const p = progress(state);
    examStatus.textContent = `${ph ? ph.title : 'COMPLETE'} — ${p.done}/${p.total} · ` +
      `${fmtTime(exam.time)} · 操作 ${exam.ops} · 警告 ${exam.alerts}`;
    if (!exam.result && exam.started && !activeItem(state)) {
      exam.result = {
        grade: gradeExam(exam), time: exam.time, ops: exam.ops, alerts: exam.alerts,
      };
      document.getElementById('exam-grade').textContent = exam.result.grade;
      document.getElementById('exam-detail').textContent =
        `所要時間 ${fmtTime(exam.result.time)} · 操作数 ${exam.result.ops}(目安 ${parOps()})· 警告発生 ${exam.result.alerts} 回`;
    }
  }
  examResult.style.display = exam && exam.result ? 'flex' : 'none';
  examStatus.style.display = exam ? '' : 'none';

  sound.update(state, d);
  if (!state.ackCaut && prevAckCaut) sound.chime();  // new caution -> single chime
  prevAckCaut = state.ackCaut;
  sound.setCrc(!state.ackWarn);                      // unacknowledged warning -> CRC

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
  if (state.exam && state.exam.started && !state.exam.result) state.exam.time += dt;
  refresh();
}, 100);

refresh();

// PWA service worker (skip on localhost so development stays uncached)
if ('serviceWorker' in navigator && !/^(localhost|127\.)/.test(location.hostname)) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

// test/debug hook
window.__state = () => state;
