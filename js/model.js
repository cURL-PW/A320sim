// Shared state model — single source of truth lives in the main window.
// The CDU window only receives snapshots and sends key events back.

export const CHANNEL_NAME = 'a320sim-v1';

export const ENG_MODE = ['CRANK', 'NORM', 'IGN/START'];
export const IR_MODE = ['OFF', 'NAV', 'ATT'];

export function coldAndDark() {
  return {
    // ELEC
    bat1: false,
    bat2: false,
    extPwrOn: false,          // GPU is assumed connected while parked (AVAIL)
    gen1: true,               // GEN pb are normally left ON
    gen2: true,
    apuGenPb: true,

    // APU
    apuMaster: false,
    apuStartPb: false,        // latched blue ON while start in progress
    apu: { state: 'off', flap: 0, n: 0, egt: 10 },
    // state: off | flap | ready | starting | avail | cooldown

    // ADIRS (IR 1/2/3)
    adirs: [
      { sel: 'OFF', align: 0, aligned: false },
      { sel: 'OFF', align: 0, aligned: false },
      { sel: 'OFF', align: 0, aligned: false },
    ],

    // FUEL pumps
    fuelPumps: { L1: false, L2: false, C1: false, C2: false, R1: false, R2: false },

    // AIR COND / BLEED
    pack1: true,
    pack2: true,
    engBleed1: true,
    engBleed2: true,
    apuBleed: false,

    // EXT LT / SIGNS
    lights: { beacon: false, navLogo: false, strobe: false, wing: false },
    signs: { seatBelts: false, noSmoking: false },

    // Engines
    engModeSel: 1,            // index into ENG_MODE
    engMaster: [false, false],
    eng: [engineOff(), engineOff()],
    // eng state: off | starting | running | spooldown

    parkBrk: true,
    fob: 6264,                // kg

    // ECAM lower display
    sd: { manual: null },     // manual page override (null = auto)

    // How long AC power has been up (for the display self-test animation)
    acTime: 0,

    // MCDU
    cdu: {
      page: 'MENU',
      scratch: '',
      msg: null,
      from: null, to: null, fltNbr: null, ci: null, crzFl: null,
    },

    // Checklist progress: itemId -> true (sticky)
    ckDone: {},
  };
}

export function engineOff() {
  return { state: 'off', n1: 0, n2: 0, egt: 10, ff: 0, ignition: false, starter: false };
}

// Values derived from state each tick. Kept separate so both windows can
// compute them from a snapshot.
export function derive(s) {
  const apuAvail = s.apu.state === 'avail';
  const eng1Run = s.eng[0].state === 'running';
  const eng2Run = s.eng[1].state === 'running';
  const acPower = s.extPwrOn
    || (apuAvail && s.apuGenPb)
    || (eng1Run && s.gen1)
    || (eng2Run && s.gen2);
  const dcPower = s.bat1 || s.bat2 || acPower;
  const apuBleedAvail = s.apuBleed && apuAvail;
  const bleedPsi = apuBleedAvail ? 38
    : (eng1Run && s.engBleed1) || (eng2Run && s.engBleed2) ? 32 : 0;
  return {
    acPower,
    dcPower,
    apuAvail,
    eng1Run,
    eng2Run,
    anyEngRun: eng1Run || eng2Run,
    bleedPsi,
    screensOn: acPower,
    booting: acPower && s.acTime < 2.5,
    batOnly: dcPower && !acPower,
  };
}
