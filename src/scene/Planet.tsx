import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { SATELLITES } from '../astro/constants';
import { BODY_INFO, PLANET_KEYS } from '../astro/info';
import type { PlanetKey } from '../astro/constants';
import { QUALITY_TIERS } from '../astro/quality';
import { useStore } from '../state/store';
import { registerBody } from '../render/registry';
import type { BodyHandle } from '../render/registry';
import { makeLabel } from '../render/labels';
import {
  createAtmoMaterial,
  createRingMaterial,
  createSaturnMaterial,
  createStandardMaterial,
} from '../shaders/materials';
import { configureTexture, gpu } from '../textures/loader';
import { proceduralTexture } from '../textures/procedural';
import { useTextures } from '../textures/context';
import { geoHigh, geoLow, makeRingGeometry } from './geometry';
import { Satellites } from './Satellites';

/* Teintes d'atmosphère par corps (liseré diurne Rayleigh, étape graphique). */
const ATMO: Record<string, { color: number; intensity: number; atmo: number }> = {
  venus: { color: 0xffd9a0, intensity: 1.05, atmo: 0xffcf9a },
  mars: { color: 0xd9a066, intensity: 0.7, atmo: 0xe8b075 },
  jupiter: { color: 0xd8b48c, intensity: 0.6, atmo: 0xf0d3a8 },
  saturn: { color: 0xe0c48f, intensity: 0.55, atmo: 0xf2e0b4 },
  uranus: { color: 0x9fe3e8, intensity: 0.65, atmo: 0xbdf0f5 },
  neptune: { color: 0x4b6fd8, intensity: 0.75, atmo: 0x7fa8ff },
};

const RING_SEGMENTS = 256;
const URANUS_RING_SEGMENTS = 128;

export function Planet({ bodyKey }: { bodyKey: PlanetKey }) {
  const tex = useTextures();
  const tier = useStore((s) => s.tier);
  const highGeo = QUALITY_TIERS[tier].highGeo;
  const axes = useStore((s) => s.layers.axes);
  const atmospheres = useStore((s) => s.layers.atmospheres);

  const group = useRef<THREE.Group>(null);
  const axisGroup = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.Mesh>(null);
  const axisLine = useRef<THREE.Line | null>(null);
  const ring = useRef<THREE.Mesh>(null);
  const clouds = useRef<THREE.Mesh>(null);
  const atmosphere = useRef<THREE.Mesh>(null);

  const info = BODY_INFO[bodyKey];
  const hasMoons = SATELLITES.some((s) => s.parent === bodyKey);

  const isSaturn = bodyKey === 'saturn';
  const isUranus = bodyKey === 'uranus';
  const isVenus = bodyKey === 'venus';

  const material = useMemo(() => {
    if (bodyKey === 'saturn') return createSaturnMaterial(tex);
    return createStandardMaterial(bodyKey, tex);
  }, [bodyKey, tex]);

  const ringMaterial = useMemo(() => {
    if (isSaturn) return createRingMaterial(tex);
    if (isUranus) {
      const ringTex = configureTexture(proceduralTexture('uranusRing', 0x51a3), { srgb: true, clamp: true }, gpu.maxAnisotropy);
      return new THREE.MeshBasicMaterial({
        map: ringTex,
        transparent: true,
        opacity: 0.34,
        side: THREE.DoubleSide,
        depthWrite: false,
        color: 0x8fb6bf,
      });
    }
    return null;
  }, [isSaturn, isUranus, tex]);

  const ringGeo = useMemo(() => {
    if (isSaturn) return makeRingGeometry(1.24, 2.36, RING_SEGMENTS);
    if (isUranus) return makeRingGeometry(1.64, 2.0, URANUS_RING_SEGMENTS);
    return null;
  }, [isSaturn, isUranus]);

  const atmoMaterial = useMemo(() => {
    const a = ATMO[bodyKey];
    if (!a) return null;
    return createAtmoMaterial(a.color, a.intensity, a.atmo);
  }, [bodyKey]);

  const cloudMaterial = useMemo(() => {
    if (!isVenus) return null;
    return new THREE.MeshStandardMaterial({
      map: tex.venusAtmosphere,
      transparent: true,
      opacity: 0.93,
      depthWrite: false,
      roughness: 1,
      metalness: 0,
    });
  }, [isVenus, tex]);

  const axisGeo = useMemo(
    () => new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0)]),
    [],
  );
  /* L'axe de rotation est créé impérativement : l'intrinsèque JSX <line> est
     capté par le SVG, pas par three. */
  const axisObject = useMemo(() => {
    const line = new THREE.Line(
      axisGeo,
      new THREE.LineBasicMaterial({ color: 0x4f9bbd, transparent: false, depthTest: false, depthWrite: false }),
    );
    line.renderOrder = -55;
    line.visible = false;
    return line;
  }, [axisGeo]);
  const label = useMemo(() => makeLabel(info.name, bodyKey), [info.name, bodyKey]);

  useEffect(() => {
    const g = group.current;
    const ag = axisGroup.current;
    const m = mesh.current;
    if (!g || !ag || !m) return;
    const handle: BodyHandle = {
      key: bodyKey,
      group: g,
      axisGroup: ag,
      mesh: m,
      material,
      uniforms: 'uniforms' in material ? (material.uniforms as Record<string, THREE.IUniform>) : undefined,
      label,
      radiusWorld: 1,
      worldPos: g.position,
      spin: 0,
      poleWorld: new THREE.Vector3(0, 1, 0),
      axisLine: axisObject,
      rings: ring.current ?? undefined,
      ringMaterial: ringMaterial instanceof THREE.ShaderMaterial ? ringMaterial : undefined,
      clouds: clouds.current ?? undefined,
      atmosphere: atmosphere.current ?? undefined,
    };
    registerBody(handle);
    return () => {
      if (useStore.getState().selected === bodyKey) useStore.setState({ selected: 'sun' });
    };
  }, [bodyKey, material, ringMaterial, label]);

  useEffect(
    () => () => {
      material.dispose();
      ringMaterial?.dispose();
      cloudMaterial?.dispose();
      atmoMaterial?.dispose();
      ringGeo?.dispose();
      axisGeo.dispose();
      (axisObject.material as THREE.Material).dispose();
      const ringMap = ringMaterial && 'map' in ringMaterial ? (ringMaterial.map as THREE.Texture | null) : null;
      ringMap?.dispose();
    },
    [material, ringMaterial, cloudMaterial, atmoMaterial, ringGeo, axisGeo],
  );

  const labelY = 1.18;

  return (
    <group ref={group} name={bodyKey}>
      <group ref={axisGroup}>
        <mesh
          ref={mesh}
          geometry={highGeo ? geoHigh : geoLow}
          material={material}
          onClick={(e) => {
            e.stopPropagation();
            useStore.getState().select(bodyKey, true);
          }}
          onPointerOver={() => {
            document.body.style.cursor = 'pointer';
          }}
          onPointerOut={() => {
            document.body.style.cursor = '';
          }}
        />
        <primitive object={axisObject} ref={axisLine} visible={axes} />
        {ringGeo && ringMaterial ? (
          <mesh
            ref={ring}
            geometry={ringGeo}
            material={ringMaterial}
            rotation={[-Math.PI / 2, 0, 0]}
            onClick={(e) => {
              e.stopPropagation();
              useStore.getState().select(bodyKey, true);
            }}
          />
        ) : null}
        {cloudMaterial ? <mesh ref={clouds} geometry={highGeo ? geoHigh : geoLow} material={cloudMaterial} visible={atmospheres} /> : null}
        {atmoMaterial ? <mesh ref={atmosphere} geometry={highGeo ? geoHigh : geoLow} material={atmoMaterial} visible={atmospheres} /> : null}
      </group>
      <primitive object={label} position={[0, labelY, 0]} />
      {hasMoons ? <Satellites parent={bodyKey} /> : null}
    </group>
  );
}

export function Planets() {
  return (
    <>
      {PLANET_KEYS.filter((k) => k !== 'earth').map((key) => (
        <Planet key={key} bodyKey={key as PlanetKey} />
      ))}
    </>
  );
}
