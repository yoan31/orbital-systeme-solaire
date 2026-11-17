import { DAYS_PER_CENTURY, DEG, J2000, OBLIQUITY_J2000, IAU_ORIENTATION, type PlanetKey } from './constants';
import { normalizeDeg, degToRad, planetHelioAU, jdFromUTC, type Vec3, type HelioState } from './kepler';

export interface LatLon { lat: number; lon: number }
export interface PoleEcl extends Vec3 { precessionDeg: number }
export interface IauState { poleEqX: number; poleEqY: number; poleEqZ: number; W: number }
export interface EarthFrame { pole: Vec3; greenwich: Vec3; west: Vec3; spin: number }

export function iauOrientation(key: PlanetKey, jd: number, out?: IauState): IauState {
  const T = (jd - J2000) / DAYS_PER_CENTURY;
  const o = IAU_ORIENTATION[key];
  out = out || ({} as IauState);
  const alpha = degToRad(o.a0 + o.da0 * T);
  const delta = degToRad(o.d0 + o.dd0 * T);
  out.poleEqX = Math.cos(delta) * Math.cos(alpha);
  out.poleEqY = Math.cos(delta) * Math.sin(alpha);
  out.poleEqZ = Math.sin(delta);
  out.W = normalizeDeg(o.W0 + o.Wdot * (jd - J2000));
  return out;
}

export function eqToEcl(x: number, y: number, z: number, out?: Vec3): Vec3 {
  const ce = Math.cos(degToRad(OBLIQUITY_J2000)), se = Math.sin(degToRad(OBLIQUITY_J2000));
  out = out || ({} as Vec3);
  out.x = x;
  out.y = y * ce + z * se;
  out.z = -y * se + z * ce;
  return out;
}

export function eclToWorld(x: number, y: number, z: number) { return { x: x, y: z, z: -y }; }

// Earth north pole in J2000 ecliptic coordinates, including general precession since J2000.
// The pole rotates westward around the ecliptic pole; this keeps equinoxes/solstices tied to the calendar.
export function earthPoleEcl(jd: number, out?: PoleEcl): PoleEcl {
  const T = (jd - J2000) / DAYS_PER_CENTURY;
  const p = degToRad((5029.0966 * T + 1.11113 * T * T) / 3600);
  const se = Math.sin(degToRad(OBLIQUITY_J2000)), ce = Math.cos(degToRad(OBLIQUITY_J2000));
  out = out || ({} as PoleEcl);
  out.x = se * Math.sin(p);
  out.y = se * Math.cos(p);
  out.z = ce;
  out.precessionDeg = p / DEG;
  return out;
}

// Solar declination (radians) from Earth heliocentric position: used to validate seasons.
export function solarDeclination(jd: number) {
  const e = planetHelioAU('earth', jd, {} as HelioState);
  const sunDir = { x: -e.x, y: -e.y, z: -e.z };
  const sl = Math.sqrt(sunDir.x * sunDir.x + sunDir.y * sunDir.y + sunDir.z * sunDir.z);
  sunDir.x /= sl; sunDir.y /= sl; sunDir.z /= sl;
  const p = earthPoleEcl(jd, {} as PoleEcl);
  return Math.asin(Math.max(-1, Math.min(1, sunDir.x * p.x + sunDir.y * p.y + sunDir.z * p.z)));
}

/* ---------------------------------------------------------------------
   ORIENTATION DE LA TERRE ET COORDONNÉES GÉOGRAPHIQUES (source unique)

   Repère scène : X = écliptique X (équinoxe J2000), Y = nord écliptique,
   Z = -écliptique Y. eclToWorld(x, y, z) = (x, z, -y) est la seule
   conversion écliptique -> monde ; l'obliquité est portée par le pôle
   terrestre (earthPoleEcl) et par eqToEcl pour les autres planètes.

   Convention de la carte équirectangulaire, identique à THREE.SphereGeometry :
   longitude 0° sur +X, est vers -Z, nord vers +Y. Elle vaut pour la carte de
   jour, la carte de nuit, les nuages, le relief, le spéculaire, l'atmosphère,
   la météo GIBS, le clic, la sonde, le nadir et les marqueurs de debug.
   --------------------------------------------------------------------- */

// Angle de rotation de la Terre (Earth Rotation Angle, IERS 2003), radians.
// Mesuré depuis le CIO (~équinoxe J2000) jusqu'au méridien de Greenwich : c'est
// l'angle du maillage terrestre. L'angle W de la table IAU est mesuré depuis le
// nœud Q du plan équatorial (ascension droite alpha0 + 90°), d'où un écart de
// ~90,3° : l'utiliser directement décalait le terminateur d'un quart de tour.
export function earthRotationAngle(jd: number) {
  return 2 * Math.PI * (0.7790572732640 + 1.00273781191135448 * (jd - 2451545.0));
}

// lat/lon (degrés, est positif) -> repère local de la Terre, rayon donné.
export function latLonToVector3(latDeg: number, lonDeg: number, radius?: number, out?: Vec3): Vec3 {
  const la = latDeg * DEG, lo = lonDeg * DEG, r = (radius === undefined ? 1 : radius);
  const cl = Math.cos(la);
  out = out || ({} as Vec3);
  out.x = cl * Math.cos(lo) * r;
  out.y = Math.sin(la) * r;
  out.z = -cl * Math.sin(lo) * r;
  return out;
}

// Inverse exact de latLonToVector3 : { lat, lon } en degrés, est positif.
export function vector3ToLatLon(v: Vec3, out?: LatLon): LatLon {
  const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z) || 1;
  out = out || ({} as LatLon);
  out.lat = Math.asin(Math.max(-1, Math.min(1, v.y / len))) / DEG;
  out.lon = Math.atan2(-v.z, v.x) / DEG;
  return out;
}

// Repère local de la Terre à l'instant jd : pôle monde et base (Greenwich,
// pôle, anti-méridien) telle que rendue par Q * Ry(spin) dans updateSpins.
// Q est la rotation minimale Y -> pôle (identique à Quaternion.setFromUnitVectors).
export function earthFrame(jd: number, out?: EarthFrame): EarthFrame {
  const p = earthPoleEcl(jd, {} as PoleEcl);
  let px = p.x, py = p.z, pz = -p.y;
  const pl = Math.sqrt(px * px + py * py + pz * pz) || 1;
  px /= pl; py /= pl; pz /= pl;
  const kx0 = pz, kz0 = -px;
  const sQ = Math.sqrt(kx0 * kx0 + kz0 * kz0);
  const kx = sQ ? kx0 / sQ : 0, kz = sQ ? kz0 / sQ : 0, cQ = py;
  const spin = earthRotationAngle(jd);
  const cs = Math.cos(spin), sn = Math.sin(spin);
  // Q * v = v c + (k x v) s + k (k.v) (1 - c), avec k = (kx, 0, kz).
  const rotQ = function (vx: number, vy: number, vz: number) {
    const cx = -kz * vy, cy = kz * vx - kx * vz, cz = kx * vy;
    const kv = kx * vx + kz * vz;
    const f = 1 - cQ;
    return {
      x: vx * cQ + cx * sQ + kx * kv * f,
      y: vy * cQ + cy * sQ,
      z: vz * cQ + cz * sQ + kz * kv * f
    };
  };
  out = out || ({} as EarthFrame);
  out.pole = out.pole || ({} as Vec3);
  out.greenwich = out.greenwich || ({} as Vec3);
  out.west = out.west || ({} as Vec3);
  // Ry(spin) * X = (cos, 0, -sin) : méridien de Greenwich (lon 0, lat 0).
  const g = rotQ(cs, 0, -sn);
  // Ry(spin) * (+Z) : longitude -90° (local +Z).
  const w = rotQ(sn, 0, cs);
  out.pole.x = px; out.pole.y = py; out.pole.z = pz;
  out.greenwich.x = g.x; out.greenwich.y = g.y; out.greenwich.z = g.z;
  out.west.x = w.x; out.west.y = w.y; out.west.z = w.z;
  out.spin = spin;
  return out;
}

// Point subsolaire (lat, lon en degrés) : direction Terre -> Soleil projetée
// dans le repère terrestre, puis vector3ToLatLon (même convention que le rendu).
export function subsolarPoint(jd: number, out?: LatLon): LatLon {
  const e = planetHelioAU('earth', jd, {} as HelioState);
  let sx = -e.x, sy = -e.y, sz = -e.z;
  const sl = Math.sqrt(sx * sx + sy * sy + sz * sz) || 1;
  sx /= sl; sy /= sl; sz /= sl;
  const Sx = sx, Sy = sz, Sz = -sy;   // eclToWorld
  const f = earthFrame(jd, {} as EarthFrame);
  const lx = Sx * f.greenwich.x + Sy * f.greenwich.y + Sz * f.greenwich.z;
  const ly = Sx * f.pole.x + Sy * f.pole.y + Sz * f.pole.z;
  const lz = Sx * f.west.x + Sy * f.west.y + Sz * f.west.z;
  return vector3ToLatLon({ x: lx, y: ly, z: lz }, out || ({} as LatLon));
}

// Direction Terre -> Soleil dans le repère monde, normalisée (X, Y, Z).
export function sunDirectionWorld(jd: number, out?: Vec3): Vec3 {
  const e = planetHelioAU('earth', jd, {} as HelioState);
  const x = -e.x, y = -e.z, z = e.y;   // eclToWorld(-e) = (-x, -z, +y)
  const l = Math.sqrt(x * x + y * y + z * z) || 1;
  out = out || ({} as Vec3);
  out.x = x / l; out.y = y / l; out.z = z / l;
  return out;
}

export interface SubsolarReference {
  when: string;
  utc: [number, number, number, number, number, number];
  lat: number;
  lon: number;
}

export interface SubsolarCheck {
  when: string; lat: number; lon: number; dLat: number; dLon: number; ok: boolean;
}

// Références de vérité terrain (point subsolaire). Les trois assertions sont
// exécutées au démarrage et à l'activation du mode debug.
export const SUBSOLAR_REFERENCE: SubsolarReference[] = [
  { when: '2026-11-08 12:00:00 UTC', utc: [2026, 11, 8, 12, 0, 0], lat: -16.7, lon: -4.1 },
  { when: '2026-11-08 13:18:36 UTC', utc: [2026, 11, 8, 13, 18, 36], lat: -16.7, lon: -23.7 },
  { when: '2026-11-08 13:34:19 UTC', utc: [2026, 11, 8, 13, 34, 19], lat: -16.7, lon: -27.7 }
];

export function checkSubsolarReference(verbose?: boolean): SubsolarCheck[] {
  const results: SubsolarCheck[] = [];
  for (const ref of SUBSOLAR_REFERENCE) {
    const jd = jdFromUTC(ref.utc[0], ref.utc[1], ref.utc[2], ref.utc[3], ref.utc[4], ref.utc[5]);
    const s = subsolarPoint(jd, {} as LatLon);
    const dLat = s.lat - ref.lat, dLon = s.lon - ref.lon;
    const ok = Math.abs(dLat) < 1 && Math.abs(dLon) < 1;
    console.assert(ok, '[subsolaire] ' + ref.when + ' attendu ' + ref.lat + '°, ' + ref.lon +
      '° — mesuré ' + s.lat.toFixed(3) + '°, ' + s.lon.toFixed(3) + '°');
    results.push({ when: ref.when, lat: s.lat, lon: s.lon, dLat, dLon, ok });
    if (verbose) {
      console.info('[subsolaire] ' + ref.when + ' : ' + s.lat.toFixed(2) + '°, ' + s.lon.toFixed(2) +
        '° (réf. ' + ref.lat + '°, ' + ref.lon + '°, écart ' + Math.abs(dLat).toFixed(2) + '° / ' +
        Math.abs(dLon).toFixed(2) + '°)');
    }
  }
  return results;
}
