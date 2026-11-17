import {
  AU_KM, DAYS_PER_CENTURY, DEG, J2000, MU_SUN_AU3D2, OBLIQUITY_J2000,
  PLANET_ELEMENTS, SATELLITES,
  type Comet, type PlanetKey, type Satellite
} from './constants';

export interface AstroRec { [k: string]: number }

export interface Vec3 { x: number; y: number; z: number }

export interface KeplerElements {
  a: number; e: number; I: number; L: number; peri: number; node: number; M: number; omega: number;
}

export interface HelioState {
  x: number; y: number; z: number; r: number;
  vx: number; vy: number; vz: number; v: number;
  a: number; e: number; periodDays: number;
  Mdeg: number; E: number; omega: number; node: number; Ideg: number;
  el?: KeplerElements;
}

export interface DateParts {
  year: number; month: number; day: number; hour: number; minute: number; second: number; ms: number;
}

function pad2(n: number) { return String(n).padStart(2, '0'); }

export function normalizeDeg(x: number) { let v = x % 360; if (v < 0) v += 360; return v; }
export function degToRad(d: number) { return d * DEG; }
export function radToDeg(r: number) { return r / DEG; }

export function dateToJD(date: Date) { return date.getTime() / 86400000 + 2440587.5; }
export function jdToDate(jd: number) { return new Date((jd - 2440587.5) * 86400000); }
export function jdFromUTC(y: number, mo: number, d: number, h: number, mi: number, s: number) { return Date.UTC(y, mo - 1, d, h, mi, s) / 86400000 + 2440587.5; }
export function jdToDateParts(jd: number): DateParts {
  const dt = new Date((jd - 2440587.5) * 86400000);
  return { year: dt.getUTCFullYear(), month: dt.getUTCMonth() + 1, day: dt.getUTCDate(), hour: dt.getUTCHours(), minute: dt.getUTCMinutes(), second: dt.getUTCSeconds(), ms: dt.getUTCMilliseconds() };
}
export function centuriesSinceJ2000(jd: number) { return (jd - J2000) / DAYS_PER_CENTURY; }
export function formatDateShort(jd: number) {
  const p = jdToDateParts(jd);
  return p.year + '-' + pad2(p.month) + '-' + pad2(p.day);
}

export function solveKepler(M: number, e: number, tol?: number) {
  tol = tol || 1e-8;
  M = ((M % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  let E = e < 0.8 ? M : Math.PI;
  for (let i = 0; i < 60; i++) {
    const f = E - e * Math.sin(E) - M;
    const fp = 1 - e * Math.cos(E);
    const dE = f / fp;
    E -= dE;
    if (Math.abs(dE) < tol) break;
  }
  return E;
}

export function elementsAt(key: PlanetKey, T: number, out?: KeplerElements): KeplerElements {
  const el = PLANET_ELEMENTS[key];
  out = out || ({} as KeplerElements);
  out.a = el.a[0] + el.a[1] * T;
  out.e = el.e[0] + el.e[1] * T;
  out.I = el.I[0] + el.I[1] * T;
  out.L = normalizeDeg(el.L[0] + el.L[1] * T);
  out.peri = normalizeDeg(el.peri[0] + el.peri[1] * T);
  out.node = normalizeDeg(el.node[0] + el.node[1] * T);
  out.M = normalizeDeg(out.L - out.peri);
  out.omega = normalizeDeg(out.peri - out.node);
  return out;
}

export function planetHelioAU(key: PlanetKey, jd: number, out?: HelioState): HelioState {
  out = out || ({} as HelioState);
  const T = (jd - J2000) / DAYS_PER_CENTURY;
  const el = elementsAt(key, T, out.el || (out.el = {} as KeplerElements));
  const M = degToRad(el.M);
  const E = solveKepler(M, el.e);
  const cosE = Math.cos(E), sinE = Math.sin(E);
  const a = el.a, e = el.e;
  const xp = a * (cosE - e);
  const yp = a * Math.sqrt(1 - e * e) * sinE;
  const w = degToRad(el.omega), O = degToRad(el.node), I = degToRad(el.I);
  const cw = Math.cos(w), sw = Math.sin(w), cO = Math.cos(O), sO = Math.sin(O), ci = Math.cos(I), si = Math.sin(I);
  out.x = xp * (cw * cO - sw * sO * ci) + yp * (-sw * cO - cw * sO * ci);
  out.y = xp * (cw * sO + sw * cO * ci) + yp * (-sw * sO + cw * cO * ci);
  out.z = xp * (sw * si) + yp * (cw * si);
  out.r = Math.sqrt(out.x * out.x + out.y * out.y + out.z * out.z);
  out.a = a; out.e = e;
  out.periodDays = 365.2568983 * Math.pow(a, 1.5);
  const vp = Math.sqrt(MU_SUN_AU3D2 / a) / (1 - e * cosE);
  const vxp = -vp * sinE;
  const vyp = vp * Math.sqrt(1 - e * e) * cosE;
  out.vx = vxp * (cw * cO - sw * sO * ci) + vyp * (-sw * cO - cw * sO * ci);
  out.vy = vxp * (cw * sO + sw * cO * ci) + vyp * (-sw * sO + cw * cO * ci);
  out.vz = vxp * (sw * si) + vyp * (cw * si);
  out.v = Math.sqrt(out.vx * out.vx + out.vy * out.vy + out.vz * out.vz) * AU_KM / 86400;
  out.Mdeg = el.M; out.E = E; out.omega = el.omega; out.node = el.node; out.Ideg = el.I;
  return out;
}

export function satelliteOffsetAU(sat: Satellite | string, jd: number, parentPoleEq: Vec3, out?: AstroRec): AstroRec {
  out = out || {};
  const st = (typeof sat === 'object') ? sat : SATELLITES.find(function (s) { return s.key === sat; })!;
  // Rotation écliptique -> repère équatorial (sans allocation).
  const ce = Math.cos(degToRad(OBLIQUITY_J2000)), se = Math.sin(degToRad(OBLIQUITY_J2000));
  const pex = parentPoleEq.x, pey = parentPoleEq.y * ce + parentPoleEq.z * se, pez = -parentPoleEq.y * se + parentPoleEq.z * ce;
  const pl = Math.sqrt(pex * pex + pey * pey + pez * pez);
  const px = pex / pl, py = pey / pl, pz = pez / pl;
  // Reference direction: world +X projected on the equatorial plane, then in ecliptic coordinates.
  let rx = 1, ry = 0, rz = 0;
  const dot = rx * px + ry * py + rz * pz;
  rx -= dot * px; ry -= dot * py; rz -= dot * pz;
  const rl = Math.sqrt(rx * rx + ry * ry + rz * rz);
  if (rl < 1e-8) { rx = 0; ry = 1; rz = 0; const d2 = ry * py + rz * pz; rx -= d2 * px; ry -= d2 * py; rz -= d2 * pz; }
  const rl2 = Math.sqrt(rx * rx + ry * ry + rz * rz); rx /= rl2; ry /= rl2; rz /= rl2;
  // e2 = pole x e1
  let e2x = py * rz - pz * ry, e2y = pz * rx - px * rz, e2z = px * ry - py * rx;
  const u = degToRad(st.L0 + 360 * (jd - J2000) / st.periodDays);
  const ci = Math.cos(degToRad(st.incl)), si = Math.sin(degToRad(st.incl));
  const aAU = st.aKm / AU_KM;
  out.x = aAU * (Math.cos(u) * rx + Math.sin(u) * (ci * e2x + si * px));
  out.y = aAU * (Math.cos(u) * ry + Math.sin(u) * (ci * e2y + si * py));
  out.z = aAU * (Math.cos(u) * rz + Math.sin(u) * (ci * e2z + si * pz));
  out.r = aAU;
  out.distKm = st.aKm;
  return out;
}

// Anomalie moyenne : phase interpolée entre les passages au périhélie observés,
// puis extrapolée avec l'intervalle le plus proche de la date demandée.
export function cometMeanAnomaly(c: Comet, jd: number) {
  const P = c.perihelia;
  if (!P || P.length === 0) return 2 * Math.PI * (jd - c.tpJD) / c.periodDays;
  if (P.length === 1) return 2 * Math.PI * (jd - P[0]) / c.periodDays;
  if (jd <= P[0]) return 2 * Math.PI * (jd - P[0]) / (P[1] - P[0]);
  for (let k = P.length - 1; k >= 1; k--) {
    if (jd >= P[k - 1] && jd < P[k]) return 2 * Math.PI * (jd - P[k - 1]) / (P[k] - P[k - 1]);
  }
  const n = P.length;
  return 2 * Math.PI * (jd - P[n - 1]) / (P[n - 1] - P[n - 2]);
}

// Passages au périhélie encadrant une date donnée.
export function cometPerihelionWindow(c: Comet, jd: number) {
  const P = c.perihelia;
  if (P && P.length === 1) {
    const k = Math.floor((jd - P[0]) / c.periodDays);
    const last = P[0] + k * c.periodDays;
    return { last, next: last + c.periodDays };
  }
  if (P && P.length >= 2) {
    if (jd < P[0]) return { last: P[0], next: P[1] };
    for (let k = P.length - 1; k >= 0; k--) {
      if (P[k] <= jd) return { last: P[k], next: P[k + 1] !== undefined ? P[k + 1] : P[k] + c.periodDays };
    }
  }
  const k = Math.floor((jd - c.tpJD) / c.periodDays);
  const last = c.tpJD + k * c.periodDays;
  return { last, next: last + c.periodDays };
}

export function cometState(c: Comet, jd: number, out?: AstroRec): AstroRec {
  out = out || {};
  const a = c.aAU, e = c.e;
  const E = solveKepler(cometMeanAnomaly(c, jd), e, 1e-9);
  const xp = a * (Math.cos(E) - e);
  const yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const w = degToRad(c.peri), O = degToRad(c.node), I = degToRad(c.incl);
  const cw = Math.cos(w), sw = Math.sin(w), cO = Math.cos(O), sO = Math.sin(O), ci = Math.cos(I), si = Math.sin(I);
  out.x = xp * (cw * cO - sw * sO * ci) + yp * (-sw * cO - cw * sO * ci);
  out.y = xp * (cw * sO + sw * cO * ci) + yp * (-sw * sO + cw * cO * ci);
  out.z = xp * (sw * si) + yp * (cw * si);
  out.r = Math.sqrt(out.x * out.x + out.y * out.y + out.z * out.z);
  const vp = Math.sqrt(MU_SUN_AU3D2 / a) / (1 - e * Math.cos(E));
  const vxp = -vp * Math.sin(E);
  const vyp = vp * Math.sqrt(1 - e * e) * Math.cos(E);
  out.vx = vxp * (cw * cO - sw * sO * ci) + vyp * (-sw * cO - cw * sO * ci);
  out.vy = vxp * (cw * sO + sw * cO * ci) + vyp * (-sw * sO + cw * cO * ci);
  out.vz = vxp * (sw * si) + vyp * (cw * si);
  out.v = Math.sqrt(out.vx * out.vx + out.vy * out.vy + out.vz * out.vz) * AU_KM / 86400;
  out.periodDays = c.periodDays;
  return out;
}
