// Lightweight Web Audio synthesis: switch clicks, APU/engine spool loops,
// avionics hum, ECAM single chime and continuous repetitive chime (CRC).
// No external audio files. The context starts on the first user gesture
// (iOS/Safari autoplay policy).

export function createSound() {
  let ctx = null;
  let master = null;
  let muted = false;
  let crcTimer = null;
  const cont = {};

  function ensure() {
    if (ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(ctx.destination);

    // shared white-noise buffer for spool loops
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

    for (const name of ['apu', 'eng1', 'eng2']) {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const filt = ctx.createBiquadFilter();
      filt.type = 'bandpass';
      filt.Q.value = 1.2;
      filt.frequency.value = 100;
      const g = ctx.createGain();
      g.gain.value = 0;
      src.connect(filt);
      filt.connect(g);
      g.connect(master);
      src.start();
      cont[name] = { filt, g };
    }

    const hum = ctx.createOscillator();
    hum.type = 'triangle';
    hum.frequency.value = 115;
    const humG = ctx.createGain();
    humG.gain.value = 0;
    hum.connect(humG);
    humG.connect(master);
    hum.start();
    cont.hum = { g: humG };
    return true;
  }

  function beep(freq, dur, when = 0, vol = 0.25, type = 'sine') {
    if (!ctx || muted) return;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    const g = ctx.createGain();
    const t = ctx.currentTime + when;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g);
    g.connect(master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  return {
    ensure,
    get muted() { return muted; },
    setMuted(m) {
      muted = m;
      if (master) master.gain.value = m ? 0 : 0.5;
      if (m) this.setCrc(false);
    },
    click() { beep(1800, 0.03, 0, 0.07, 'square'); },
    chime() { beep(660, 0.9, 0, 0.3); beep(880, 0.7, 0.05, 0.15); },
    setCrc(on) {
      if (on && !crcTimer && ctx && !muted) {
        const pulse = () => { beep(620, 0.18, 0, 0.28, 'square'); beep(470, 0.18, 0.22, 0.28, 'square'); };
        pulse();
        crcTimer = setInterval(pulse, 550);
      }
      if (!on && crcTimer) {
        clearInterval(crcTimer);
        crcTimer = null;
      }
    },
    update(s, d) {
      if (!ctx || muted) return;
      cont.apu.g.gain.value = (s.apu.n / 100) * 0.10;
      cont.apu.filt.frequency.value = 300 + s.apu.n * 14;
      for (let i = 0; i < 2; i++) {
        const c = cont['eng' + (i + 1)];
        const n = s.eng[i].n2;
        c.g.gain.value = Math.min(0.14, (n / 60) * 0.14);
        c.filt.frequency.value = 80 + n * 9;
      }
      cont.hum.g.gain.value = d.acPower ? 0.015 : 0;
    },
  };
}
