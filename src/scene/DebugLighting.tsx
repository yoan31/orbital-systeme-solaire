import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useStore } from '../state/store';
import { bodies } from '../render/registry';
import { debugMarkers, runDebugAssertions } from '../render/lightDebug';

/* Marqueurs 3D au point subsolaire, à Paris et à Greenwich, attachés au mesh
   terrestre : même repère que les textures et les shaders. */
export function DebugLighting() {
  const enabled = useStore((s) => s.debugLight);
  const materials = useMemo(
    () => [0xffe066, 0xff5fa2, 0x66e0ff].map((color) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, depthWrite: false })),
    [],
  );

  useEffect(() => {
    const geo = new THREE.SphereGeometry(1, 14, 10);
    const meshes = materials.map((material) => {
      const m = new THREE.Mesh(geo, material);
      m.scale.setScalar(0.017);
      m.visible = false;
      return m;
    });
    debugMarkers.subsolar = meshes[0];
    debugMarkers.paris = meshes[1];
    debugMarkers.greenwich = meshes[2];
    return () => {
      geo.dispose();
      materials.forEach((m) => m.dispose());
    };
  }, [materials]);

  /* Activation : assertions subsolaires réexécutées, comme dans l'original. */
  useEffect(() => {
    if (enabled) runDebugAssertions();
  }, [enabled]);

  /* Attachement au mesh terrestre dès qu'il existe (ordre de montage libre). */
  useFrame(() => {
    const earth = bodies.get('earth');
    const list = [debugMarkers.subsolar, debugMarkers.paris, debugMarkers.greenwich];
    if (!earth) return;
    for (const m of list) {
      if (!m) continue;
      if (m.parent !== earth.mesh) earth.mesh.add(m);
      m.visible = enabled;
    }
  });

  return null;
}
