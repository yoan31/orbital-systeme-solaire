import * as THREE from 'three';
import { AU_KM, AU_UNITS_REAL, PED } from '../astro/constants';
import { BODY_INFO } from '../astro/info';
import type { Satellite } from '../astro/constants';
import { useStore } from '../state/store';

/* Échelles monde : identiques au moteur d'origine. Le mode est lu dans le
   store à chaque appel pour que la boucle reste sans allocation. */
export function auToWorld(x: number, y: number, z: number, out: THREE.Vector3): THREE.Vector3 {
  const mode = useStore.getState().mode;
  const r = Math.sqrt(x * x + y * y + z * z);
  if (mode === 'real') {
    out.set(x * AU_UNITS_REAL, z * AU_UNITS_REAL, -y * AU_UNITS_REAL);
  } else {
    const k = (PED.distScale * Math.pow(Math.max(r, 1e-9), PED.distPower)) / Math.max(r, 1e-9);
    out.set(x * k, z * k, -y * k);
  }
  return out;
}

export function kmToWorld(km: number): number {
  const mode = useStore.getState().mode;
  return mode === 'real' ? (km / AU_KM) * AU_UNITS_REAL : PED.distScale * Math.pow(km / AU_KM, PED.distPower);
}

export function visualRadiusFor(key: string): number {
  const info = BODY_INFO[key];
  const mode = useStore.getState().mode;
  if (mode === 'real') return Math.max((info.radiusKm / AU_KM) * AU_UNITS_REAL, 0.0000008);
  return PED.radiusScale * Math.pow(info.radiusKm / 6371, PED.radiusPower);
}

export function visualRadiusSatellite(sat: Satellite): number {
  const mode = useStore.getState().mode;
  if (mode === 'real') return Math.max((sat.radiusKm / AU_KM) * AU_UNITS_REAL, 0.0000005);
  return PED.satelliteRadius * PED.radiusScale * Math.pow(sat.radiusKm / 6371, PED.radiusPower);
}

export function maxSystemRadius(): number {
  const v = auToWorld(50, 0, 0, new THREE.Vector3());
  return v.length() * 1.15;
}

export function smoothstep(a: number, b: number, x: number): number {
  if (a === b) return x < a ? 0 : 1;
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
