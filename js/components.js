// Touch-friendly cockpit widgets. Each factory returns { el, update(state, derived) }.

function div(cls, parent) {
  const el = document.createElement('div');
  el.className = cls;
  if (parent) parent.appendChild(el);
  return el;
}

// Korry push button: two light halves (top / bottom) + caption below.
// topLit/botLit are (state, derived) => bool; lights only work with DC power.
export function korry({ label, top = '', bottom = '', topColor = 'amber', botColor = 'blue',
                        topLit, botLit, onPress }) {
  const wrap = div('ctl');
  const btn = document.createElement('button');
  btn.className = 'korry';
  btn.type = 'button';
  const t = div('k-half k-top', btn);
  t.textContent = top;
  const b = div('k-half k-bot', btn);
  b.textContent = bottom;
  wrap.appendChild(btn);
  div('ctl-label', wrap).textContent = label;
  btn.addEventListener('click', onPress);
  return {
    el: wrap,
    update(s, d) {
      t.className = 'k-half k-top' + (d.dcPower && topLit && topLit(s, d) ? ' lit-' + topColor : '');
      b.className = 'k-half k-bot' + (d.dcPower && botLit && botLit(s, d) ? ' lit-' + botColor : '');
    },
  };
}

// Rotary selector. Tap left half = CCW, right half = CW.
export function rotary({ label, positions, get, set }) {
  const wrap = div('ctl');
  const posRow = div('rot-positions', wrap);
  const posEls = positions.map(p => {
    const e = document.createElement('span');
    e.textContent = p;
    posRow.appendChild(e);
    return e;
  });
  const knobWrap = div('rot-knobwrap', wrap);
  const knob = div('rot-knob', knobWrap);
  div('rot-pointer', knob);
  const zl = document.createElement('button');
  zl.className = 'rot-zone rot-left'; zl.type = 'button'; zl.setAttribute('aria-label', label + ' CCW');
  const zr = document.createElement('button');
  zr.className = 'rot-zone rot-right'; zr.type = 'button'; zr.setAttribute('aria-label', label + ' CW');
  knobWrap.append(zl, zr);
  div('ctl-label', wrap).textContent = label;
  zl.addEventListener('click', () => set(Math.max(0, get() - 1)));
  zr.addEventListener('click', () => set(Math.min(positions.length - 1, get() + 1)));
  const span = positions.length - 1;
  return {
    el: wrap,
    update() {
      const i = get();
      knob.style.transform = `rotate(${(i / span - 0.5) * 80}deg)`;
      posEls.forEach((e, j) => e.classList.toggle('active', j === i));
    },
  };
}

// Two-position toggle switch (external lights, signs).
export function toggle({ label, get, set, onText = 'ON', offText = 'OFF' }) {
  const wrap = div('ctl');
  const btn = document.createElement('button');
  btn.className = 'toggle'; btn.type = 'button';
  const lever = div('tg-lever', btn);
  const stateTxt = div('tg-state', btn);
  wrap.appendChild(btn);
  div('ctl-label', wrap).textContent = label;
  btn.addEventListener('click', () => set(!get()));
  return {
    el: wrap,
    update() {
      const on = get();
      btn.classList.toggle('on', on);
      lever.classList.toggle('up', on);
      stateTxt.textContent = on ? onText : offText;
    },
  };
}

// Three-position switch (e.g. STROBE OFF/AUTO/ON, XPDR mode).
// positions are listed bottom-to-top; tap the upper/lower half to move the lever.
export function toggle3({ label, positions, get, set }) {
  const wrap = div('ctl');
  const posCol = div('t3-positions', wrap);
  const posEls = [...positions].reverse().map(p => {
    const e = document.createElement('span');
    e.textContent = p;
    posCol.appendChild(e);
    return e;
  });
  const body = div('toggle t3', wrap);
  const lever = div('tg-lever', body);
  const up = document.createElement('button');
  up.className = 't3-zone t3-up'; up.type = 'button'; up.setAttribute('aria-label', label + ' up');
  const down = document.createElement('button');
  down.className = 't3-zone t3-down'; down.type = 'button'; down.setAttribute('aria-label', label + ' down');
  body.append(up, down);
  div('ctl-label', wrap).textContent = label;
  const max = positions.length - 1;
  up.addEventListener('click', () => set(Math.min(max, get() + 1)));
  down.addEventListener('click', () => set(Math.max(0, get() - 1)));
  const tops = [36, 21, 6]; // lever y per index (bottom -> top), within the 66px body
  return {
    el: wrap,
    update() {
      const i = get();
      lever.style.top = tops[i] + 'px';
      lever.classList.toggle('up', i === max);
      posEls.forEach((e, j) => e.classList.toggle('active', positions.length - 1 - j === i));
    },
  };
}

// ENG master lever.
export function masterLever({ label, get, set }) {
  const wrap = div('ctl');
  const btn = document.createElement('button');
  btn.className = 'master'; btn.type = 'button';
  const grip = div('master-grip', btn);
  grip.textContent = label;
  const stateTxt = div('master-state', btn);
  wrap.appendChild(btn);
  btn.addEventListener('click', () => set(!get()));
  return {
    el: wrap,
    update() {
      const on = get();
      btn.classList.toggle('on', on);
      stateTxt.textContent = on ? 'ON' : 'OFF';
    },
  };
}

// Parking brake handle.
export function parkBrkHandle({ get, set }) {
  const wrap = div('ctl');
  const btn = document.createElement('button');
  btn.className = 'pbrk'; btn.type = 'button';
  div('pbrk-handle', btn);
  wrap.appendChild(btn);
  div('ctl-label', wrap).textContent = 'PARK BRK';
  btn.addEventListener('click', () => set(!get()));
  return {
    el: wrap,
    update() { btn.classList.toggle('on', get()); },
  };
}

// Panel section with etched border + title.
export function section(title, cls = '') {
  const el = div('panel-section ' + cls);
  const t = div('panel-title', el);
  t.textContent = title;
  const body = div('panel-body', el);
  return { el, body };
}
