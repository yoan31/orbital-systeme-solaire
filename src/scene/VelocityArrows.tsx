import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { COMETS } from '../astro/constants';
import { BODY_INFO, PLANET_KEYS } from '../astro/info';
import { useStore } from '../state/store';

export const velocityArrows = new Map<string, THREE.ArrowHelper>();

/* Vecteurs vitesse (vis-viva) : objets ArrowHelper lus par la boucle, qui
   recalcule direction et longueur selon la distance caméra. */
export function VelocityArrows() {
  const group = useRef<THREE.Group>(null);
  const velocity = useStore((s) => s.layers.velocity);

  useEffect(() => {
    const g = group.current;
    if (!g) return;
    for (const key of [...PLANET_KEYS, ...COMETS.map((c) => c.key)]) {
      const color = new THREE.Color(BODY_INFO[key].color);
      const arrow = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(), 1, color, 0.22, 0.12);
      (arrow.line.material as THREE.Material).transparent = false;
      (arrow.cone.material as THREE.Material).transparent = false;
      g.add(arrow);
      velocityArrows.set(key, arrow);
    }
    return () => {
      for (const [key, arrow] of velocityArrows) {
        g.remove(arrow);
        arrow.dispose();
        velocityArrows.delete(key);
      }
    };
  }, []);

  return <group ref={group} name="velocity" visible={velocity} />;
}
