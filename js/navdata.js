// Scenario database. Data-driven so more routes can be added later:
// entering a matching FROM/TO on the MCDU INIT page selects the scenario.
// Coordinates are simplified 2D (x east / y north, nm relative to departure).

export const SCENARIOS = [
  {
    id: 'RJAA-RJGG',
    name: 'NARITA → CHUBU CENTRAIR',
    from: { icao: 'RJAA', rwy: '34L', hdg: 337, elev: 135, sid: 'SWAMP1' },
    to: { icao: 'RJGG', rwy: '36', hdg: 356, elev: 15, appr: 'ILS36', ilsFreq: '108.30', star: 'OLIVE1', vApp: 135 },
    crzFl: 240,
    thrRedAlt: 1500,   // AGL
    accAlt: 1500,
    clearance: { initAlt: 6000, qnh: 1006, squawk: '2000' },
    loadsheet: { zfw: 54.3, zfwcg: 28.0 },
    // recommended take-off data (EFB perf calc stand-in for TOW ~60.6t)
    toData: { v1: 135, vr: 137, v2: 140, flex: 55, flapsThs: '1/UP0.5', transAlt: 14000 },
    // route: departure runway -> SID wp -> enroute -> STAR wp -> arrival runway
    route: [
      { id: 'RJAA34L', x: 0, y: 0, kind: 'rwy' },
      { id: 'SWAMP', x: -4, y: 10, kind: 'sid' },
      { id: 'KAINE', x: -30, y: -5 },
      { id: 'FUJEE', x: -65, y: -18 },
      { id: 'YAIZU', x: -90, y: -28 },
      { id: 'TOHME', x: -120, y: -60 },
      { id: 'OLIVE', x: -148, y: -70, kind: 'star' },
      { id: 'RJGG36', x: -150, y: -55, kind: 'rwy' },
    ],
  },
];

export function getScenario(s) {
  return SCENARIOS.find(x => x.id === s.gnd.scenario) || SCENARIOS[0];
}

export function findScenarioByRoute(from, to) {
  return SCENARIOS.find(x => x.from.icao === from && x.to.icao === to) || null;
}

// Cumulative along-track distance for each route point.
export function routeDistances(sc) {
  const d = [0];
  for (let i = 1; i < sc.route.length; i++) {
    const a = sc.route[i - 1], b = sc.route[i];
    d.push(d[i - 1] + Math.hypot(b.x - a.x, b.y - a.y));
  }
  return d;
}

export function totalDistance(sc) {
  const d = routeDistances(sc);
  return d[d.length - 1];
}

// Position and leg heading at along-track distance `pos`.
export function routePoint(sc, pos) {
  const dists = routeDistances(sc);
  const total = dists[dists.length - 1];
  const p = Math.max(0, Math.min(total, pos));
  let i = 1;
  while (i < dists.length - 1 && dists[i] < p) i++;
  const a = sc.route[i - 1], b = sc.route[i];
  const seg = dists[i] - dists[i - 1] || 1;
  const f = (p - dists[i - 1]) / seg;
  const x = a.x + (b.x - a.x) * f;
  const y = a.y + (b.y - a.y) * f;
  const hdg = (Math.atan2(b.x - a.x, b.y - a.y) * 180 / Math.PI + 360) % 360;
  // index of the waypoint we are flying TO
  return { x, y, hdg, toIdx: i, toId: sc.route[i].id, toDist: dists[i] - p };
}
