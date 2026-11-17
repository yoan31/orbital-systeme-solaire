import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { QUALITY_TIERS } from '../astro/quality';
import { useStore } from '../state/store';
import { bodies, registerBody, unregisterBody } from '../render/registry';
import { setSunDisc } from '../render/postfx';
import type { BodyHandle } from '../render/registry';
import { makeLabel } from '../render/labels';
import { createSunMaterial } from '../shaders/materials';
import { makeGlowTexture, makeStreakTexture } from '../textures/procedural';
import { useTextures } from '../textures/context';
import { geoSunHigh, geoSunLow } from './geometry';
import { LensFlare } from './LensFlare';

export function Sun() {
  const tex = useTextures();
  const tier = useStore((s) => s.tier);
  const highGeo = QUALITY_TIERS[tier].highGeo;

  const group = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.Mesh>(null);
  const corona = useRef<THREE.Sprite>(null);
  const halo = useRef<THREE.Sprite>(null);
  const streak = useRef<THREE.Sprite>(null);
  const disc = useRef<THREE.Mesh>(null);

  const material = useMemo(() => createSunMaterial(tex), [tex]);
  const glowTex = useMemo(() => makeGlowTexture(), []);
  const streakTex = useMemo(() => makeStreakTexture(), []);
  const coronaMat = useMemo(
    () =>
      new THREE.SpriteMaterial({
        map: glowTex,
        color: 0xffc46b,
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: true,
      }),
    [glowTex],
  );
  const haloMat = useMemo(
    () =>
      new THREE.SpriteMaterial({
        map: glowTex,
        color: 0xff7a1a,
        transparent: true,
        opacity: 0.16,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: true,
      }),
    [glowTex],
  );
  const streakMat = useMemo(
    () =>
      new THREE.SpriteMaterial({
        map: streakTex,
        color: 0xffd9a0,
        transparent: true,
        opacity: 0.28,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: false,
      }),
    [streakTex],
  );

  const label = useMemo(() => makeLabel('Soleil', 'sun'), []);
  /* Disque translucide additif : source des god rays (doit être transparent et
     ne pas écrire la profondeur). Il réchauffe à peine le limbe. */
  const discMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: 0xfff2d8,
        transparent: true,
        opacity: 0.28,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    [],
  );

  useEffect(() => {
    const m = mesh.current;
    const c = corona.current;
    const h = halo.current;
    const st = streak.current;
    const g = group.current;
    const lbl = label;
    if (!m || !c || !h || !g || !st) return;
    const handle: BodyHandle = {
      key: 'sun',
      group: g,
      mesh: m,
      material,
      uniforms: material.uniforms,
      label: lbl,
      radiusWorld: 1,
      worldPos: g.position,
      spin: 0,
      poleWorld: new THREE.Vector3(0, 1, 0),
      glow: c,
    };
    registerBody(handle);
    return () => {
      unregisterBody('sun');
    };
  }, [material, label]);

  useEffect(() => {
    setSunDisc(disc.current);
    return () => setSunDisc(null);
  }, []);

  /* Sprite « streak » anamorphique : largeur liée au rayon solaire, opacité
     pilotée par uFlare (éruptions NOAA). */
  useFrame(() => {
    const st = streak.current;
    if (!st) return;
    const r = bodies.get('sun')?.radiusWorld ?? 1;
    st.scale.set(r * 7.4, r * 0.34, 1);
    const flare = (material.uniforms.uFlare?.value as number) ?? 0;
    streakMat.opacity = 0.07 + 0.22 * Math.min(1, flare);
    if (disc.current) disc.current.scale.setScalar(r * 1.005);
  });

  useEffect(
    () => () => {
      material.dispose();
      discMaterial.dispose();
      coronaMat.dispose();
      haloMat.dispose();
      streakMat.dispose();
      glowTex.dispose();
      streakTex.dispose();
    },
    [material, discMaterial, coronaMat, haloMat, streakMat, glowTex, streakTex],
  );

  return (
    <group ref={group} name="sun">
      <mesh
        ref={mesh}
        geometry={highGeo ? geoSunHigh : geoSunLow}
        material={material}
        onClick={(e) => {
          e.stopPropagation();
          useStore.getState().select('sun', true);
        }}
        onPointerOver={() => {
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = '';
        }}
      />
      <sprite ref={corona} material={coronaMat} scale={[2.45, 2.45, 1]} />
      <sprite ref={halo} material={haloMat} scale={[4.1, 4.1, 1]} />
      <sprite ref={streak} material={streakMat} renderOrder={6} />
      <mesh ref={disc} material={discMaterial} renderOrder={1}>
        <circleGeometry args={[1, 64]} />
      </mesh>
      <primitive object={label} position={[0, 1.4, 0]} />
      <LensFlare />
    </group>
  );
}
