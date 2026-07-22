// FCU / glareshield: SPD, HDG (managed/selected), ALT, V/S, baro (QNH/STD).
// Touch model: tap a SPD/HDG knob to "push" it into managed mode (tap again to
// pull it back to selected); ALT knob has -/+ zones stepping 1000 ft; the baro
// knob has -/+ zones stepping 1 hPa plus a QNH/STD push.
import { CLEARANCE } from '../model.js';

function div(cls, parent) {
  const el = document.createElement('div');
  el.className = cls;
  if (parent) parent.appendChild(el);
  return el;
}

function windowBox(parent, label) {
  const wrap = div('fcu-cell fcu-' + label.toLowerCase().replace(/\W/g, ''), parent);
  div('fcu-winlabel', wrap).textContent = label;
  const win = div('fcu-window', wrap);
  return { wrap, win };
}

function knobZones(parent, onLeft, onRight, ariaBase) {
  const kw = div('fcu-knobwrap', parent);
  div('fcu-knob', kw);
  const zl = document.createElement('button');
  zl.className = 'fcu-zone fcu-zl'; zl.type = 'button'; zl.textContent = '–';
  zl.setAttribute('aria-label', ariaBase + ' decrease');
  const zr = document.createElement('button');
  zr.className = 'fcu-zone fcu-zr'; zr.type = 'button'; zr.textContent = '+';
  zr.setAttribute('aria-label', ariaBase + ' increase');
  kw.append(zl, zr);
  zl.addEventListener('click', onLeft);
  zr.addEventListener('click', onRight);
  return kw;
}

export function buildFcu(root, act) {
  // clearance strip (training aid)
  const clr = div('fcu-clearance', root);
  clr.textContent = `DELIVERY CLR: INIT ALT ${CLEARANCE.initAlt} FT · QNH ${CLEARANCE.qnh} · SQUAWK ${CLEARANCE.squawk}`;

  const row = div('fcu-row', root);

  // MASTER WARN / CAUT (glareshield attention-getters; press to acknowledge)
  const warnCell = div('fcu-cell fcu-attn', row);
  const mw = attnLight(warnCell, 'MASTER\nWARN', 'warn',
    () => act.do(s => { s.ackWarn = true; }));
  const mc = attnLight(warnCell, 'MASTER\nCAUT', 'caut',
    () => act.do(s => { s.ackCaut = true; }));

  // SPD
  const spd = windowBox(row, 'SPD');
  const spdBtn = pushKnob(spd.wrap, 'SPD managed', () =>
    act.do(s => { s.fcu.spdManaged = !s.fcu.spdManaged; }));

  // HDG
  const hdg = windowBox(row, 'HDG');
  const hdgBtn = pushKnob(hdg.wrap, 'HDG managed', () =>
    act.do(s => { s.fcu.hdgManaged = !s.fcu.hdgManaged; }));

  // ALT
  const alt = windowBox(row, 'ALT');
  knobZones(alt.wrap,
    () => act.do(s => { s.fcu.alt = Math.max(100, prevThousand(s.fcu.alt)); }),
    () => act.do(s => { s.fcu.alt = Math.min(39000, nextThousand(s.fcu.alt)); }),
    'ALT');

  // V/S (display only)
  const vs = windowBox(row, 'V/S');

  // AP1 / APPR pushbuttons
  const apCell = div('fcu-cell fcu-apcell', row);
  div('fcu-winlabel', apCell).textContent = 'AP / APPR';
  const ap1Btn = document.createElement('button');
  ap1Btn.type = 'button';
  ap1Btn.className = 'fcu-apbtn';
  ap1Btn.dataset.guide = 'ap1';
  ap1Btn.dataset.help = '@ap1';
  ap1Btn.dataset.helpTitle = 'AP1';
  ap1Btn.textContent = 'AP1';
  ap1Btn.addEventListener('click', () => act.do(s => {
    if (s.flight.airborne || s.flight.ap1) s.flight.ap1 = !s.flight.ap1;
  }));
  const apprBtn = document.createElement('button');
  apprBtn.type = 'button';
  apprBtn.className = 'fcu-apbtn';
  apprBtn.dataset.guide = 'appr';
  apprBtn.dataset.help = '@appr';
  apprBtn.dataset.helpTitle = 'APPR';
  apprBtn.textContent = 'APPR';
  apprBtn.addEventListener('click', () => act.do(s => {
    if (s.flight.phase !== 'ground') s.flight.appr = !s.flight.appr;
  }));
  apCell.append(ap1Btn, apprBtn);

  // BARO
  const baro = windowBox(row, 'QNH');
  knobZones(baro.wrap,
    () => act.do(s => { s.fcu.baro = Math.max(950, s.fcu.baro - 1); }),
    () => act.do(s => { s.fcu.baro = Math.min(1060, s.fcu.baro + 1); }),
    'QNH');
  const stdBtn = document.createElement('button');
  stdBtn.type = 'button';
  stdBtn.className = 'fcu-std';
  stdBtn.textContent = 'STD⇄QNH';
  stdBtn.addEventListener('click', () =>
    act.do(s => { s.fcu.baroMode = s.fcu.baroMode === 'STD' ? 'QNH' : 'STD'; }));
  baro.wrap.appendChild(stdBtn);

  return {
    update(s, d) {
      const on = d.acPower;
      root.classList.toggle('unpowered', !on);
      spd.win.textContent = !on ? '' : s.fcu.spdManaged ? '---' : String(s.fcu.spd);
      hdg.win.textContent = !on ? '' : s.fcu.hdgManaged ? '---' : String(s.fcu.hdg).padStart(3, '0');
      alt.win.textContent = !on ? '' : String(s.fcu.alt).padStart(5, '0');
      vs.win.textContent = !on ? '' : '-----';
      baro.win.textContent = !on ? '' : s.fcu.baroMode === 'STD' ? 'STD' : String(s.fcu.baro);
      spdBtn.classList.toggle('managed', s.fcu.spdManaged);
      hdgBtn.classList.toggle('managed', s.fcu.hdgManaged);
      mw.classList.toggle('lit', d.dcPower && !s.ackWarn);
      mc.classList.toggle('lit', d.dcPower && !s.ackCaut);
      ap1Btn.classList.toggle('on', s.flight.ap1);
      apprBtn.classList.toggle('on', s.flight.appr);
    },
  };
}

function attnLight(parent, label, kind, onPress) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'attn attn-' + kind;
  b.textContent = label;
  b.addEventListener('click', onPress);
  parent.appendChild(b);
  return b;
}

function pushKnob(parent, aria, onPush) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'fcu-push';
  b.textContent = 'PUSH';
  b.setAttribute('aria-label', aria);
  b.addEventListener('click', onPush);
  parent.appendChild(b);
  return b;
}

function nextThousand(v) { return Math.floor(v / 1000) * 1000 + 1000; }
function prevThousand(v) { return v <= 1000 ? 100 : Math.ceil(v / 1000) * 1000 - 1000; }
