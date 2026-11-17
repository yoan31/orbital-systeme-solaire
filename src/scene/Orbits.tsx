import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { COMETS, COMET_BY_KEY, J2000 } from '../astro/constants';
import { BODY_INFO, PLANET_KEYS } from '../astro/info';
import { degToRad, elementsAt } from '../astro/kepler';
import { auToWorld } from '../render/scales';
import { useStore } from '../state/store';
import { bgRefs } from './bg';

const POINTS = 512;
const tmpV = new THREE.Vector3();

export interface OrbitEntry {
  line: THREE.Line;
  points: number;
  el: Record<string, number>;
}

export const orbitElements: Record<string, OrbitEntry> = {};

/* Orbites képlériennes recalculées depuis le JD (512 segments, 14 corps).
   Appelée par la boucle au rythme de l'interface, pas à chaque image. */
export function updateOrbitLines(jd: number): void {
  const T = (jd - J2000) / 36525;
  for (const key of PLANET_KEYS) {
    const entry = orbitElements[key];
    if (!entry) continue;
    const arr = (entry.line.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
    const el = elementsAt(key, T, entry.el as never);
    const N = entry.points;
    const a = el.a;
    const e = el.e;
    const w = degToRad(el.omega);
    const O = degToRad(el.node);
    const I = degToRad(el.I);
    const cw = Math.cos(w);
    const sw = Math.sin(w);
    const cO = Math.cos(O);
    const sO = Math.sin(O);
    const ci = Math.cos(I);
    const si = Math.sin(I);
    for (let i = 0; i <= N; i++) {
      const E = (i / N) * Math.PI * 2;
      const xp = a * (Math.cos(E) - e);
      const yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
      const x = xp * (cw * cO - sw * sO * ci) + yp * (-sw * cO - cw * sO * ci);
      const y = xp * (cw * sO + sw * cO * ci) + yp * (-sw * sO + cw * cO * ci);
      const z = xp * (sw * si) + yp * (cw * si);
      auToWorld(x, y, z, tmpV);
      arr[i * 3] = tmpV.x;
      arr[i * 3 + 1] = tmpV.y;
      arr[i * 3 + 2] = tmpV.z;
    }
    (entry.line.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }
  for (const c of COMETS) {
    const h = orbitElements[c.key];
    if (!h) continue;
    const arr = (h.line.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
    const a = c.aAU;
    const e = c.e;
    const w = degToRad(c.peri);
    const O = degToRad(c.node);
    const I = degToRad(c.incl);
    const cw = Math.cos(w);
    const sw = Math.sin(w);
    const cO = Math.cos(O);
    const sO = Math.sin(O);
    const ci = Math.cos(I);
    const si = Math.sin(I);
    for (let i = 0; i <= h.points; i++) {
      const E = (i / h.points) * Math.PI * 2;
      const xp = a * (Math.cos(E) - e);
      const yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
      const x = xp * (cw * cO - sw * sO * ci) + yp * (-sw * cO - cw * sO * ci);
      const y = xp * (cw * sO + sw * cO * ci) + yp * (-sw * sO + cw * cO * ci);
      const z = xp * (sw * si) + yp * (cw * si);
      auToWorld(x, y, z, tmpV);
      arr[i * 3] = tmpV.x;
      arr[i * 3 + 1] = tmpV.y;
      arr[i * 3 + 2] = tmpV.z;
    }
    (h.line.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }
}

export function Orbits() {
  const orbits = useStore((s) => s.layers.orbits);
  const mode = useStore((s) => s.mode);
  const keys = useMemo(() => [...PLANET_KEYS, ...COMETS.map((c) => c.key)], []);

  const geoms = useMemo(
    () =>
      keys.map(() => {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array((POINTS + 1) * 3), 3));
        return geo;
      }),
    [keys],
  );

  const mats = useMemo(
    () =>
      keys.map((key) => {
        const color = new THREE.Color(BODY_INFO[key].color);
        const dim = color.clone().multiplyScalar(COMET_BY_KEY[key] ? 0.72 : 0.48);
        return new THREE.LineBasicMaterial({ color: dim, transparent: false, depthTest: false, depthWrite: false });
      }),
    [keys],
  );

  useEffect(() => {
    const group = bgRefs.orbitGroup;
    if (!group) return;
    keys.forEach((key, i) => {
      const line = new THREE.Line(geoms[i], mats[i]);
      line.frustumCulled = false;
      line.renderOrder = -70;
      group.add(line);
      orbitElements[key] = { line, points: POINTS, el: {} };
    });
    updateOrbitLines(useStore.getState().jd);
    return () => {
      keys.forEach((key, i) => {
        group.remove(orbitElements[key].line);
        delete orbitElements[key];
        geoms[i].dispose();
        mats[i].dispose();
      });
    };
  }, [keys, geoms, mats, mode]);

  return <group ref={(el) => { bgRefs.orbitGroup = el; }} name="orbits" visible={orbits} />;
}
