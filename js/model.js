// Shared state model — single source of truth lives in the main window.
// The CDU window only receives snapshots and sends key events back.

export const CHANNEL_NAME = 'a320sim-v1';

export const ENG_MODE = ['CRANK', 'NORM', 'IGN/START'];
export const IR_MODE = ['OFF', 'NAV', 'ATT'];
export const STROBE_MODE = ['OFF', 'AUTO', 'ON'];
export const XPDR_MODE = ['STBY', 'AUTO', 'TA/RA'];

// The default fuel load (6264 kg) fits in the wing tanks — centre tank empty.
// Running centre pumps on an empty tank lights their FAULT (low pressure).
export const CENTER_TANK_EMPTY = true;

export const FLAP_POS = ['0', '1', '2', '3', 'FULL'];
export const NOSE_LT = ['OFF', 'TAXI', 'T.O'];
export const AUTO_BRK = ['OFF', 'LO', 'MED', 'MAX'];

// Fixed "clearance" for the training scenario (shown on the FCU panel):
// initial altitude, local QNH, squawk. The load sheet mirrors the EFB.
export const CLEARANCE = { initAlt: 6000, qnh: 1006, squawk: '2000' };
export const LOADSHEET = { zfw: 54.3, zfwcg: 28.0, block: 6.3 };

export function coldAndDark() {
  return {
    // Ground services (EFB stand-in)
    gnd: { gpu: false },      // GPU must be connected before EXT PWR shows AVAIL

    // ELEC
    bat1: false,
    bat2: false,
    extPwrOn: false,
    gen1: true,               // GEN pb are normally left ON
    gen2: true,
    apuGenPb: true,
    busTie: true,             // AUTO

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

    // AIR COND / BLEED — packs stay OFF until APU bleed is available
    pack1: false,
    pack2: false,
    engBleed1: true,
    engBleed2: true,
    apuBleed: false,

    // HYD (normal positions in cold & dark; verify-only)
    hyd: { eng1Pump: true, ptu: true, eng2Pump: true },

    // ANTI ICE
    antiIce: { wing: false, eng1: false, eng2: false },

    // EXT LT / SIGNS
    lights: { beacon: false, navLogo: false, strobe: 'OFF', wing: false, nose: 'OFF', rwyTurnOff: false },
    signs: { seatBelts: false, noSmoking: false },

    // ATC / transponder
    xpdr: { code: '0000', mode: 'STBY' },

    // FCU / glareshield ("previous flight" values: SPD/HDG left selected)
    fcu: {
      spdManaged: false, spd: 250,
      hdgManaged: false, hdg: 320,
      alt: 100,
      baroMode: 'STD', baro: 1013,
    },

    // Flight prep (after start)
    spdBrkArmed: false,
    flapLever: 0,             // index into FLAP_POS
    flapPos: 0,               // animated actual position
    autoBrk: 'OFF',
    fctl: {
      ail: 0, elev: 0, rud: 0,   // commanded deflection -1..1 (decays)
      done: { left: false, right: false, up: false, down: false, rudl: false, rudr: false },
    },
    toConfig: null,           // null | 'normal' | 'warning'

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
      zfw: null, zfwcg: null, block: null,                       // INIT B
      v1: null, vr: null, v2: null, transAlt: null, flapsThs: null, flex: null, // PERF
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
