import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { COMETS } from '../astro/constants';
import type { Comet } from '../astro/constants';
import { useStore } from '../state/store';
import { registerBody } from '../render/registry';
import type { BodyHandle } from '../render/registry';
import { makeLabel } from '../render/labels';
import { makeGlowTexture } from '../textures/procedural';
import { geoLow } from './geometry';

function CometBody({ comet, glowTexture }: { comet: Comet; glowTexture: THREE.Texture }) {
  const group = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.Mesh>(null);
  const glow = useRef<THREE.Sprite>(null);
  const comets = useStore((s) => s.layers.comets);

  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0x5b6b6a,
        emissive: 0x0d2a25,
        emissiveIntensity: 1.2,
        roughness: 1,
      }),
    [],
  );
  const glowMaterial = useMemo(
    () =>
      new THREE.SpriteMaterial({
        map: glowTexture,
        color: new THREE.Color(comet.color),
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [glowTexture, comet.color],
  );
  const label = useMemo(() => makeLabel(comet.label, comet.key, true), [comet.label, comet.key]);

  useEffect(() => {
    const g = group.current;
    const m = mesh.current;
    if (!g || !m) return;
    const handle: BodyHandle = {
      key: comet.key,
      group: g,
      mesh: m,
      material,
      label,
      radiusWorld: 1,
      worldPos: g.position,
      spin: 0,
      poleWorld: new THREE.Vector3(0, 1, 0),
      glow: glow.current ?? undefined,
      comet: true,
    };
    registerBody(handle);
  }, [comet.key, material, label]);

  useEffect(
    () => () => {
      material.dispose();
      glowMaterial.dispose();
    },
    [material, glowMaterial],
  );

  return (
    <group ref={group} name={comet.key} visible={comets}>
      <mesh
        ref={mesh}
        geometry={geoLow}
        material={material}
        onClick={(e) => {
          e.stopPropagation();
          useStore.getState().select(comet.key, true);
        }}
      />
      <sprite ref={glow} material={glowMaterial} />
      <primitive object={label} position={[0, 0.3, 0]} />
    </group>
  );
}

export function Comets() {
  const glowTexture = useMemo(() => makeGlowTexture(), []);
  useEffect(() => () => glowTexture.dispose(), [glowTexture]);
  return (
    <>
      {COMETS.map((c) => (
        <CometBody key={c.key} comet={c} glowTexture={glowTexture} />
      ))}
    </>
  );
}
