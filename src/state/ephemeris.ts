import * as THREE from 'three';
import { COMETS, SATELLITES } from '../astro/constants';
import { PLANET_KEYS } from '../astro/info';

/* Éphémérides mutables, hors React : réécrites à chaque image sans allocation.
   Les panneaux UI lisent des instantanés poussés dans le store (250 ms). */
export interface PlanetState {
  el: Record<string, number>;
  x: number;
  y: number;
  z: number;
  r: number;
  vx: number;
  vy: number;
  vz: number;
  v: number;
  a: number;
  e: number;
  periodDays: number;
  Mdeg?: number;
  E?: number;
  omega?: number;
  node?: number;
  Ideg?: number;
  distEarthAU?: number;
  sunDistAU?: number;
}

export interface SatelliteState {
  x: number;
  y: number;
  z: number;
  r: number;
  distKm: number;
  wx: number;
  wy: number;
  wz: number;
  distEarthAU: number;
  speed: number;
}

export interface MoonState {
  x: number;
  y: number;
  z: number;
  r: number;
  vx: number;
  vy: number;
  vz: number;
  gx: number;
  gy: number;
  gz: number;
  lon: number;
  lat: number;
  lonOfDate: number;
  latOfDate: number;
  distKm: number;
  distEarthAU?: number;
  T?: number;
}

export const ephemeris: Record<string, PlanetState> = {};
for (const key of PLANET_KEYS) ephemeris[key] = { el: {}, x: 0, y: 0, z: 0, r: 0, vx: 0, vy: 0, vz: 0, v: 0, a: 0, e: 0, periodDays: 0 };
for (const c of COMETS) ephemeris[c.key] = { el: {}, x: 0, y: 0, z: 0, r: 0, vx: 0, vy: 0, vz: 0, v: 0, a: 0, e: 0, periodDays: 0 };

export const satelliteEphemeris: Record<string, SatelliteState> = {};
for (const sat of SATELLITES) satelliteEphemeris[sat.key] = { x: 0, y: 0, z: 0, r: 0, distKm: 0, wx: 0, wy: 0, wz: 0, distEarthAU: 0, speed: 0 };

export const moonGeo: MoonState = { x: 0, y: 0, z: 0, r: 0, vx: 0, vy: 0, vz: 0, gx: 0, gy: 0, gz: 0, lon: 0, lat: 0, lonOfDate: 0, latOfDate: 0, distKm: 0 };

/* Réutilisés par la boucle : jamais réalloués. */
export const scratch = {
  v: new THREE.Vector3(),
  v2: new THREE.Vector3(),
  v3: new THREE.Vector3(),
  offset: new THREE.Vector3(),
  direction: new THREE.Vector3(),
  quat: new THREE.Quaternion(),
  orient: {} as Record<string, number>,
  poleEq: { x: 0, y: 0, z: 0 } as { x: number; y: number; z: number },
  ecl: { x: 0, y: 0, z: 0 } as { x: number; y: number; z: number },
  poleWorld: new THREE.Vector3(),
  zero: new THREE.Vector3(0, 0, 0),
};
