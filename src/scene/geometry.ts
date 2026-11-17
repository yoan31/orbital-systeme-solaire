import * as THREE from 'three';

/* Géométries partagées par tous les corps : créées une fois, jamais libérées
   (le palier de qualité choisit haut/bas, comme dans le moteur d'origine). */
export const geoHigh = new THREE.SphereGeometry(1, 64, 32);
export const geoLow = new THREE.SphereGeometry(1, 20, 10);
export const geoSunHigh = new THREE.SphereGeometry(1, 96, 48);
export const geoSunLow = new THREE.SphereGeometry(1, 32, 16);

export function makeRingGeometry(inner: number, outer: number, segments: number): THREE.BufferGeometry {
  const positions = new Float32Array((segments + 1) * 2 * 3);
  const uvs = new Float32Array((segments + 1) * 2 * 2);
  const normals = new Float32Array(positions.length);
  const indices: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const k = i * 2;
    positions[k * 3] = c * inner;
    positions[k * 3 + 1] = s * inner;
    positions[k * 3 + 2] = 0;
    positions[(k + 1) * 3] = c * outer;
    positions[(k + 1) * 3 + 1] = s * outer;
    positions[(k + 1) * 3 + 2] = 0;
    normals[k * 3 + 2] = 1;
    normals[(k + 1) * 3 + 2] = 1;
    uvs[k * 2] = 0;
    uvs[k * 2 + 1] = 0.5;
    uvs[(k + 1) * 2] = 1;
    uvs[(k + 1) * 2 + 1] = 0.5;
    if (i < segments) {
      const p = i * 2;
      indices.push(p, p + 1, p + 2, p + 1, p + 3, p + 2);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  return geo;
}
