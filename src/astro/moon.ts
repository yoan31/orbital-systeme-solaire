import { AU_KM, DAYS_PER_CENTURY, J2000 } from './constants';
import { normalizeDeg, degToRad, planetHelioAU, type HelioState } from './kepler';

export interface MoonGeo {
  lonOfDate: number; latOfDate: number; lon: number; lat: number; distKm: number;
  x: number; y: number; z: number; T: number;
  gx?: number; gy?: number; gz?: number; r?: number; vx?: number; vy?: number; vz?: number;
}

// Meeus, Astronomical Algorithms, chapter 47 (truncated ELP 2000/82). Units: 1e-6 deg and 1e-3 km.
export const MOON_LON_TERMS: number[][] = [
  [0,0,1,0,6288774],[2,0,-1,0,1274027],[2,0,0,0,658314],[0,0,2,0,213618],[0,1,0,0,-185116],[0,0,0,2,-114332],
  [2,0,-2,0,58793],[2,-1,-1,0,57066],[2,0,1,0,53322],[2,-1,0,0,45758],[0,1,-1,0,-40923],[1,0,0,0,-34720],
  [0,1,1,0,-30383],[2,0,0,-2,15327],[0,0,1,2,-12528],[0,0,1,-2,10980],[4,0,-1,0,10675],[0,0,3,0,10034],
  [4,0,-2,0,8548],[2,1,-1,0,-7888],[2,1,0,0,-6766],[1,0,-1,0,-5163],[1,1,0,0,4987],[2,-1,1,0,4036],
  [2,0,2,0,3994],[4,0,0,0,3861],[2,0,-3,0,3665],[0,1,-2,0,-2689],[2,0,-1,2,-2602],[2,-1,-2,0,2390],
  [1,0,1,0,-2348],[2,-2,0,0,2236],[0,1,2,0,-2120],[0,2,0,0,-2069],[2,-2,-1,0,2048],[2,0,1,-2,-1773],
  [2,0,0,2,-1595],[4,-1,-1,0,1215],[0,0,2,2,-1110],[3,0,-1,0,-892],[2,1,1,0,-810],[4,-1,-2,0,759],
  [0,2,-1,0,-713],[2,2,-1,0,-700],[2,1,-2,0,691],[2,-1,0,-2,596],[4,0,1,0,549],[0,0,4,0,537],
  [4,-1,0,0,520],[1,0,-2,0,-487],[2,1,0,-2,-399],[0,0,2,-2,-381],[1,1,1,0,351],[3,0,-2,0,-340],
  [4,0,-3,0,330],[2,-1,2,0,327],[0,2,1,0,-323],[1,1,-1,0,299],[2,0,3,0,294]
];
export const MOON_LAT_TERMS: number[][] = [
  [0,0,0,1,5128122],[0,0,1,1,280602],[0,0,1,-1,277693],[2,0,0,-1,173237],[2,0,-1,1,55413],[2,0,-1,-1,46271],
  [2,0,0,1,32573],[0,0,2,1,17198],[2,0,1,-1,9266],[0,0,2,-1,8822],[2,-1,0,-1,8216],[2,0,-2,-1,4324],
  [2,0,1,1,4200],[2,1,0,-1,-3359],[2,-1,-1,1,2463],[2,-1,0,1,2211],[2,-1,-1,-1,2065],[0,1,-1,-1,-1870],
  [4,0,-1,-1,1828],[0,1,0,1,-1794],[0,0,0,3,-1749],[0,1,-1,1,-1565],[1,0,0,1,-1491],[0,1,1,1,-1475],
  [0,1,1,-1,-1410],[0,1,0,-1,-1344],[1,0,0,-1,-1335],[0,0,3,1,1107],[4,0,0,-1,1021],[4,0,-1,1,833],
  [0,0,1,-3,777],[4,0,-2,1,671],[2,0,0,-3,607],[2,0,2,-1,596],[2,-1,1,-1,491],[2,0,-2,1,-451],
  [0,0,3,-1,439],[2,0,2,1,422],[2,0,-3,-1,421],[2,1,-1,1,-366],[2,1,0,1,-351],[4,0,0,1,331],
  [2,-1,1,1,315],[2,-2,0,-1,302],[0,0,1,3,-283],[2,1,1,-1,-229],[1,1,0,-1,223],[1,1,0,1,223],
  [0,1,-2,-1,-220],[2,1,-1,-1,-220],[1,0,1,1,-185],[2,-1,-2,-1,181],[0,1,2,1,-177],[4,0,-2,-1,176],
  [4,-1,-1,-1,166],[1,0,1,-1,-164],[4,0,1,-1,132],[1,0,-1,-1,-119],[4,-1,0,-1,115],[2,-2,0,1,107]
];
export const MOON_DIST_TERMS: number[][] = [
  [0,0,1,0,-20905355],[2,0,-1,0,-3699111],[2,0,0,0,-2955968],[0,0,2,0,-569925],[0,1,0,0,48888],[0,0,0,2,-3149],
  [2,0,-2,0,246158],[2,-1,-1,0,-152138],[2,0,1,0,-170733],[2,-1,0,0,-204586],[0,1,-1,0,-129620],[1,0,0,0,108743],
  [0,1,1,0,104755],[2,0,0,-2,10321],[0,0,1,-2,79661],[4,0,-1,0,-34782],[0,0,3,0,-23210],[4,0,-2,0,-21636],
  [2,1,-1,0,24208],[2,1,0,0,30824],[1,0,-1,0,-8379],[1,1,0,0,-16675],[2,-1,1,0,-12831],[2,0,2,0,-10445],
  [4,0,0,0,-11650],[2,0,-3,0,14403],[0,1,-2,0,-7003],[2,-1,-2,0,10056],[1,0,1,0,6322],[2,-2,0,0,-9884],
  [0,1,2,0,5751],[0,2,0,0,-4950],[2,-2,-1,0,4130],[2,0,0,2,-3958],[4,-1,-1,0,3258],[0,0,2,2,2616],
  [3,0,-1,0,-1897],[2,1,1,0,-2117],[4,-1,-2,0,2354],[2,2,-1,0,-1423],[2,1,-2,0,-1117],[2,-1,0,-2,-1571],
  [4,0,1,0,-1739],[4,-1,0,0,-4421]
];

export function moonGeocentric(jd: number, out?: MoonGeo): MoonGeo {
  out = out || ({} as MoonGeo);
  const T = (jd - J2000) / DAYS_PER_CENTURY;
  const T2 = T * T, T3 = T2 * T, T4 = T3 * T;
  const Lp = normalizeDeg(218.3164477 + 481267.88123421 * T - 0.0015786 * T2 + T3 / 538841 - T4 / 65194000);
  const D = normalizeDeg(297.8501921 + 445267.1114034 * T - 0.0018819 * T2 + T3 / 545868 - T4 / 113065000);
  const M = normalizeDeg(357.5291092 + 35999.0502909 * T - 0.0001536 * T2 + T3 / 24490000);
  const Mp = normalizeDeg(134.9633964 + 477198.8675055 * T + 0.0087414 * T2 + T3 / 69699 - T4 / 14712000);
  const F = normalizeDeg(93.2720950 + 483202.0175233 * T - 0.0036539 * T2 - T3 / 3526000 + T4 / 863310000);
  const A1 = normalizeDeg(119.75 + 131.849 * T);
  const A2 = normalizeDeg(53.09 + 479264.290 * T);
  const A3 = normalizeDeg(313.45 + 481266.484 * T);
  const E = 1 - 0.002516 * T - 0.0000074 * T2;
  const Dr = degToRad(D), Mr = degToRad(M), Mpr = degToRad(Mp), Fr = degToRad(F);
  let sl = 0, sr = 0, sb = 0;
  for (let i = 0; i < MOON_LON_TERMS.length; i++) {
    const t = MOON_LON_TERMS[i];
    const arg = t[0] * Dr + t[1] * Mr + t[2] * Mpr + t[3] * Fr;
    let f = 1;
    if (Math.abs(t[1]) === 1) f = E; else if (Math.abs(t[1]) === 2) f = E * E;
    sl += t[4] * f * Math.sin(arg);
  }
  for (let i = 0; i < MOON_DIST_TERMS.length; i++) {
    const t = MOON_DIST_TERMS[i];
    const arg = t[0] * Dr + t[1] * Mr + t[2] * Mpr + t[3] * Fr;
    let f = 1;
    if (Math.abs(t[1]) === 1) f = E; else if (Math.abs(t[1]) === 2) f = E * E;
    sr += t[4] * f * Math.cos(arg);
  }
  for (let i = 0; i < MOON_LAT_TERMS.length; i++) {
    const t = MOON_LAT_TERMS[i];
    const arg = t[0] * Dr + t[1] * Mr + t[2] * Mpr + t[3] * Fr;
    let f = 1;
    if (Math.abs(t[1]) === 1) f = E; else if (Math.abs(t[1]) === 2) f = E * E;
    sb += t[4] * f * Math.sin(arg);
  }
  sl += 3958 * Math.sin(degToRad(A1)) + 1962 * Math.sin(degToRad(Lp - F)) + 318 * Math.sin(degToRad(A2));
  sb += -2235 * Math.sin(degToRad(Lp)) + 382 * Math.sin(degToRad(A3)) + 175 * Math.sin(degToRad(A1 - F)) + 175 * Math.sin(degToRad(A1 + F)) + 127 * Math.sin(degToRad(Lp - Mp)) - 115 * Math.sin(degToRad(Lp + Mp));
  const lonOfDate = normalizeDeg(Lp + sl / 1000000);
  const latOfDate = sb / 1000000;
  const distKm = 385000.56 + sr / 1000;
  // Mean equinox of date -> J2000 (general precession in longitude, nutation omitted).
  const precessionArcsec = 5029.0966 * T + 1.11113 * T2 - 0.000006 * T3;
  const lonJ2000 = normalizeDeg(lonOfDate - precessionArcsec / 3600);
  const lonR = degToRad(lonJ2000), latR = degToRad(latOfDate);
  const cd = Math.cos(latR);
  out.lonOfDate = lonOfDate;
  out.latOfDate = latOfDate;
  out.lon = lonJ2000;
  out.lat = latOfDate;
  out.distKm = distKm;
  out.x = distKm * cd * Math.cos(lonR);
  out.y = distKm * cd * Math.sin(lonR);
  out.z = distKm * Math.sin(latR);
  out.T = T;
  return out;
}

export function earthMoonState(jd: number, earthOut: HelioState, moonOut: MoonGeo): HelioState {
  const emb = planetHelioAU('earth', jd, earthOut);
  const m = moonGeocentric(jd, moonOut || {});
  const f = 1 / (1 + 81.30056);
  const mx = m.x / AU_KM, my = m.y / AU_KM, mz = m.z / AU_KM;
  earthOut.x = emb.x - f * mx;
  earthOut.y = emb.y - f * my;
  earthOut.z = emb.z - f * mz;
  earthOut.r = Math.sqrt(earthOut.x * earthOut.x + earthOut.y * earthOut.y + earthOut.z * earthOut.z);
  const mo = moonOut;
  mo.gx = m.x; mo.gy = m.y; mo.gz = m.z;
  mo.x = earthOut.x + mx;
  mo.y = earthOut.y + my;
  mo.z = earthOut.z + mz;
  mo.r = Math.sqrt(mo.x * mo.x + mo.y * mo.y + mo.z * mo.z);
  mo.vx = emb.vx; mo.vy = emb.vy; mo.vz = emb.vz;
  return earthOut;
}
