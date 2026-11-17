import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { clock } from '../state/clock';
import { rng } from '../textures/procedural';
import { makeStarSpikeTexture } from '../textures/procedural';
import { useTextures } from '../textures/context';
import { bgRefs } from './bg';
import STARS_VERT from '../shaders/stars_vert.glsl?raw';
import STARS_FRAG from '../shaders/stars_frag.glsl?raw';

const STAR_COUNT = 9000;
const SKY_RADIUS = 62000;

/* 30 étoiles les plus brillantes, RA (h) / Dec (°) J2000. */
const BRIGHT_STARS: [number, number, number][] = [
  [6.7525, -16.716, 1], [6.3992, -52.696, 0.97], [14.261, 19.182, 0.95], [18.6156, 38.784, 0.92],
  [5.2782, 45.998, 0.9], [5.2423, -8.202, 0.88], [7.6551, 5.225, 0.86], [5.9195, 7.407, 0.84],
  [1.6286, -57.237, 0.82], [14.0637, -60.373, 0.8], [19.8464, 8.868, 0.79], [12.4433, -63.099, 0.78],
  [4.5987, 16.509, 0.76], [16.4901, -26.432, 0.75], [13.4199, -11.161, 0.74], [7.7553, 28.026, 0.72],
  [22.9608, -29.622, 0.71], [20.6905, 45.28, 0.7], [12.7953, -59.689, 0.69], [10.1395, 11.967, 0.68],
  [6.977, -28.972, 0.67], [7.5763, 31.888, 0.66], [12.5194, -57.113, 0.65], [17.5601, -37.104, 0.64],
  [5.4189, 6.35, 0.63], [5.4382, 28.608, 0.62], [9.22, -69.717, 0.61], [22.1372, -46.961, 0.6],
  [5.6036, -1.202, 0.6], [5.6793, -1.943, 0.59],
];

function buildStars() {
  const pos = new Float32Array(STAR_COUNT * 3);
  const col = new Float32Array(STAR_COUNT * 3);
  const phase = new Float32Array(STAR_COUNT);
  const speed = new Float32Array(STAR_COUNT);
  const bright = new Float32Array(STAR_COUNT);
  const r = rng(0x5eed);
  for (let i = 0; i < STAR_COUNT; i++) {
    const u = r() * 2 - 1;
    const a = r() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    pos[i * 3] = Math.cos(a) * s * SKY_RADIUS;
    pos[i * 3 + 1] = u * SKY_RADIUS;
    pos[i * 3 + 2] = Math.sin(a) * s * SKY_RADIUS;
    const c = 0.55 + r() * 0.45;
    col[i * 3] = c * (0.86 + r() * 0.14);
    col[i * 3 + 1] = c * (0.9 + r() * 0.1);
    col[i * 3 + 2] = c;
    phase[i] = r() * Math.PI * 2;
    speed[i] = 0.6 + r() * 2.6;
    bright[i] = r();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
  g.setAttribute('aSpeed', new THREE.BufferAttribute(speed, 1));
  g.setAttribute('aBright', new THREE.BufferAttribute(bright, 1));
  return g;
}

function buildBrightStars() {
  const pos = new Float32Array(BRIGHT_STARS.length * 3);
  const col = new Float32Array(BRIGHT_STARS.length * 3);
  BRIGHT_STARS.forEach(([ra, dec, mag], i) => {
    const raR = (ra * 15 * Math.PI) / 180;
    const decR = (dec * Math.PI) / 180;
    const cr = Math.cos(decR);
    pos[i * 3] = cr * Math.cos(raR) * (SKY_RADIUS + 400);
    pos[i * 3 + 1] = Math.sin(decR) * (SKY_RADIUS + 400);
    pos[i * 3 + 2] = cr * Math.sin(raR) * (SKY_RADIUS + 400);
    // Teinte approchée : bleutées au-dessus de 0,5 de magnitude relative.
    const t = Math.min(1, Math.max(0, mag));
    col[i * 3] = 0.82 + 0.18 * (1 - t);
    col[i * 3 + 1] = 0.88 + 0.1 * (1 - t);
    col[i * 3 + 2] = 1;
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

export function Sky() {
  const tex = useTextures();
  const group = useRef<THREE.Group>(null);
  const starsGeo = useMemo(() => buildStars(), []);
  const brightGeo = useMemo(() => buildBrightStars(), []);
  const spikeTex = useMemo(() => makeStarSpikeTexture(), []);

  const starsMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uSize: { value: 1.6 } },
        vertexShader: STARS_VERT,
        fragmentShader: STARS_FRAG,
        transparent: true,
        vertexColors: true,
        depthTest: false,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );

  const brightMat = useMemo(
    () =>
      new THREE.PointsMaterial({
        map: spikeTex,
        size: 34,
        sizeAttenuation: false,
        transparent: true,
        vertexColors: true,
        depthTest: false,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [spikeTex],
  );

  useEffect(() => {
    bgRefs.skyGroup = group.current;
    bgRefs.starsMaterial = starsMat;
  }, [starsMat]);

  useEffect(
    () => () => {
      starsGeo.dispose();
      brightGeo.dispose();
      starsMat.dispose();
      brightMat.dispose();
      spikeTex.dispose();
    },
    [starsGeo, brightGeo, starsMat, brightMat, spikeTex],
  );

  useFrame(() => {
    starsMat.uniforms.uTime.value = clock.timeElapsed;
  });

  return (
    <group ref={group} name="sky">
      <mesh rotation={[0, 1.2, 0]} renderOrder={-100}>
        <sphereGeometry args={[70000, 64, 32]} />
        <meshBasicMaterial map={tex.milkyway} side={THREE.BackSide} depthWrite={false} color={0x9098a8} />
      </mesh>
      <points geometry={starsGeo} material={starsMat} renderOrder={-95} />
      <mesh renderOrder={-99}>
        <sphereGeometry args={[68500, 48, 24]} />
        <meshBasicMaterial
          map={tex.starsLayer}
          side={THREE.BackSide}
          transparent
          opacity={0.16}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          depthTest
          color={0x8ea2b8}
        />
      </mesh>
      <points geometry={brightGeo} material={brightMat} renderOrder={-94} />
    </group>
  );
}
