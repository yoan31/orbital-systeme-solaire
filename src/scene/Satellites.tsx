import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { SATELLITES } from '../astro/constants';
import type { Satellite } from '../astro/constants';
import { useStore } from '../state/store';
import { registerSatellite } from '../render/registry';
import type { BodyHandle } from '../render/registry';
import { makeLabel } from '../render/labels';
import { geoLow } from './geometry';

function SatelliteBody({ sat }: { sat: Satellite }) {
  const group = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.Mesh>(null);
  const satellites = useStore((s) => s.layers.satellites);
  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ color: sat.color, roughness: 0.92, metalness: 0 }),
    [sat.color],
  );
  const label = useMemo(() => makeLabel(sat.name, sat.key, true), [sat.name, sat.key]);

  useEffect(() => {
    const g = group.current;
    const m = mesh.current;
    if (!g || !m) return;
    const handle: BodyHandle = {
      key: sat.key,
      group: g,
      mesh: m,
      material,
      label,
      radiusWorld: 1,
      worldPos: new THREE.Vector3(),
      spin: 0,
      poleWorld: new THREE.Vector3(0, 1, 0),
      sat,
    };
    registerSatellite(handle);
  }, [sat, material, label]);

  useEffect(() => () => material.dispose(), [material]);

  return (
    <group ref={group} name={sat.key} visible={satellites}>
      <mesh
        ref={mesh}
        geometry={geoLow}
        material={material}
        onClick={(e) => {
          e.stopPropagation();
          useStore.getState().select(sat.key, true);
        }}
      />
      <primitive object={label} position={[0, 1.55, 0]} />
    </group>
  );
}

export function Satellites({ parent }: { parent: string }) {
  const list = SATELLITES.filter((s) => s.parent === parent);
  return (
    <>
      {list.map((sat) => (
        <SatelliteBody key={sat.key} sat={sat} />
      ))}
    </>
  );
}
