import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { QUALITY_TIERS } from '../astro/quality';
import { degToRad } from '../astro/kepler';
import { useStore } from '../state/store';
import { createBeltMaterial } from '../shaders/materials';
import { rng } from '../textures/procedural';

const MAIN_COUNT = 140000;
const KUIPER_COUNT = 80000;

function makeBeltGeometry(
  count: number,
  inner: number,
  outer: number,
  eScale: number,
  incMax: number,
  tintA: number,
  tintB: number,
  kirkwood: boolean,
): THREE.BufferGeometry {
  const a = new Float32Array(count);
  const ecc = new Float32Array(count);
  const inc = new Float32Array(count);
  const node = new Float32Array(count);
  const peri = new Float32Array(count);
  const m0 = new Float32Array(count);
  const n = new Float32Array(count);
  const psize = new Float32Array(count);
  const tint = new Float32Array(count * 3);
  const r = rng(count + (kirkwood ? 31 : 77));
  const ca = new THREE.Color(tintA);
  const cb = new THREE.Color(tintB);
  const cc = new THREE.Color();
  const TAU = Math.PI * 2;
  void eScale;
  for (let i = 0; i < count; i++) {
    let av: number;
    let guard = 0;
    do {
      av = inner + Math.pow(r(), kirkwood ? 1.5 : 0.8) * (outer - inner);
      guard++;
    } while (kirkwood && guard < 8 && (Math.abs(av - 2.5) < 0.025 || Math.abs(av - 2.82) < 0.025 || Math.abs(av - 2.95) < 0.02));
    a[i] = av;
    ecc[i] = Math.min(kirkwood ? 0.22 : 0.32, 0.012 + -Math.log(1 - r() * 0.98) * (kirkwood ? 0.035 : 0.05));
    inc[i] = degToRad(Math.pow(r(), 1.35) * incMax);
    node[i] = r() * TAU;
    peri[i] = r() * TAU;
    m0[i] = r() * TAU;
    n[i] = 0.01720209895 / Math.pow(av, 1.5);
    psize[i] = kirkwood ? 0.55 + r() * 1.25 : 0.75 + r() * 1.8;
    const mix = r() * 0.8;
    cc.copy(ca).lerp(cb, mix);
    const bright = 0.42 + r() * 0.42;
    tint[i * 3] = cc.r * bright;
    tint[i * 3 + 1] = cc.g * bright;
    tint[i * 3 + 2] = cc.b * bright;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  g.setAttribute('a', new THREE.BufferAttribute(a, 1));
  g.setAttribute('ecc', new THREE.BufferAttribute(ecc, 1));
  g.setAttribute('inc', new THREE.BufferAttribute(inc, 1));
  g.setAttribute('node', new THREE.BufferAttribute(node, 1));
  g.setAttribute('peri', new THREE.BufferAttribute(peri, 1));
  g.setAttribute('m0', new THREE.BufferAttribute(m0, 1));
  g.setAttribute('n', new THREE.BufferAttribute(n, 1));
  g.setAttribute('psize', new THREE.BufferAttribute(psize, 1));
  g.setAttribute('tint', new THREE.BufferAttribute(tint, 3));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e9);
  return g;
}

export function Belts() {
  const tier = useStore((s) => s.tier);
  const belts = useStore((s) => s.layers.belts);
  const material = useMemo(() => createBeltMaterial(), []);
  const mainGeo = useMemo(() => makeBeltGeometry(MAIN_COUNT, 2.06, 3.3, 2.0, 20.0, 0x8a7a66, 0x5a5148, true), []);
  const kuiperGeo = useMemo(() => makeBeltGeometry(KUIPER_COUNT, 29.5, 50.0, 0.02, 26.0, 0xc6d8e8, 0x2a2f35, false), []);

  useEffect(() => {
    const total = QUALITY_TIERS[tier].asteroids;
    const main = Math.floor(total * 0.64);
    mainGeo.setDrawRange(0, main);
    kuiperGeo.setDrawRange(0, total - main);
  }, [tier, mainGeo, kuiperGeo]);

  useEffect(
    () => () => {
      mainGeo.dispose();
      kuiperGeo.dispose();
      material.dispose();
    },
    [mainGeo, kuiperGeo, material],
  );

  return (
    <group name="belts" visible={belts}>
      <points geometry={mainGeo} material={material} frustumCulled={false} renderOrder={-60} />
      <points geometry={kuiperGeo} material={material} frustumCulled={false} renderOrder={-60} />
    </group>
  );
}
