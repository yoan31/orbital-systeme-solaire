import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { QUALITY_TIERS } from '../astro/quality';
import { useStore } from '../state/store';
import { registerBody } from '../render/registry';
import type { BodyHandle } from '../render/registry';
import { makeLabel } from '../render/labels';
import { createMoonMaterial } from '../shaders/materials';
import { useTextures } from '../textures/context';
import { geoHigh, geoLow } from './geometry';

export function Moon() {
  const tex = useTextures();
  const tier = useStore((s) => s.tier);
  const highGeo = QUALITY_TIERS[tier].highGeo;
  const group = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.Mesh>(null);
  const material = useMemo(() => createMoonMaterial(tex), [tex]);
  const label = useMemo(() => makeLabel('Lune', 'moon', true), []);

  useEffect(() => {
    const g = group.current;
    const m = mesh.current;
    if (!g || !m) return;
    const handle: BodyHandle = {
      key: 'moon',
      group: g,
      mesh: m,
      material,
      uniforms: material.uniforms as Record<string, THREE.IUniform>,
      label,
      radiusWorld: 1,
      worldPos: new THREE.Vector3(),
      spin: 0,
      poleWorld: new THREE.Vector3(0, 1, 0),
    };
    registerBody(handle);
  }, [material, label]);

  useEffect(() => () => material.dispose(), [material]);

  return (
    <group ref={group} name="moon">
      <mesh
        ref={mesh}
        geometry={highGeo ? geoHigh : geoLow}
        material={material}
        onClick={(e) => {
          e.stopPropagation();
          useStore.getState().select('moon', true);
        }}
        onPointerOver={() => {
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = '';
        }}
      />
      <primitive object={label} position={[0, 1.2, 0]} />
    </group>
  );
}
