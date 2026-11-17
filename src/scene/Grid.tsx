import { useEffect, useState } from 'react';
import * as THREE from 'three';
import { auToWorld } from '../render/scales';
import { useStore } from '../state/store';
import { bgRefs } from './bg';

const RADII_AU = [1, 2, 3, 4, 5, 10, 15, 20, 30, 40, 50];
const tmpV = new THREE.Vector3();

/* Anneaux de repère en UA sur le plan écliptique + rayons tous les 15°.
   Reconstruit quand l'échelle change (les rayons monde dépendent du mode). */
function buildGrid(): THREE.Group {
  const group = new THREE.Group();
  const verts: number[] = [];
  for (const au of RADII_AU) {
    auToWorld(au, 0, 0, tmpV);
    const rw = Math.hypot(tmpV.x, tmpV.y, tmpV.z);
    for (let i = 0; i < 128; i++) {
      const a1 = (i / 128) * Math.PI * 2;
      const a2 = ((i + 1) / 128) * Math.PI * 2;
      verts.push(Math.cos(a1) * rw, 0, Math.sin(a1) * rw, Math.cos(a2) * rw, 0, Math.sin(a2) * rw);
    }
  }
  auToWorld(55, 0, 0, tmpV);
  const outerR = Math.hypot(tmpV.x, tmpV.y, tmpV.z);
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    verts.push(0, 0, 0, Math.cos(a) * outerR, 0, Math.sin(a) * outerR);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  const m = new THREE.LineBasicMaterial({ color: 0x183149, transparent: false, depthTest: false, depthWrite: false });
  const grid = new THREE.LineSegments(g, m);
  grid.renderOrder = -80;
  group.add(grid);
  return group;
}

function disposeGrid(group: THREE.Group): void {
  group.traverse((o) => {
    const mesh = o as THREE.Mesh;
    mesh.geometry?.dispose();
    const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
    else mat?.dispose();
  });
}

export function Grid() {
  const mode = useStore((s) => s.mode);
  const [group, setGroup] = useState<THREE.Group | null>(null);

  useEffect(() => {
    const g = buildGrid();
    bgRefs.gridGroup = g;
    setGroup(g);
    return () => {
      disposeGrid(g);
      if (bgRefs.gridGroup === g) bgRefs.gridGroup = null;
    };
  }, [mode]);

  return group ? <primitive object={group} /> : null;
}
