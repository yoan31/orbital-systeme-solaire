import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { bodies } from '../render/registry';
import { makeGlowTexture } from '../textures/procedural';

/* Lens flare : trois fantômes additifs placés sur l'axe Soleil ↔ centre écran,
   opacité proportionnelle à la visibilité du Soleil et à uFlare (NOAA).
   Coût négligeable : 3 sprites, aucun rendu supplémentaire. */
const GHOSTS = [
  { k: 0.45, size: 0.19, color: 0xffd9a0, opacity: 0.2 },
  { k: 0.85, size: 0.1, color: 0x9fd3ea, opacity: 0.17 },
  { k: 1.35, size: 0.27, color: 0xff9d2e, opacity: 0.12 },
];

const sunWorld = new THREE.Vector3(0, 0, 0);
const camSpace = new THREE.Vector3();
const ndc = new THREE.Vector3();
const place = new THREE.Vector3();

export function LensFlare() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const glowTex = useMemo(() => makeGlowTexture(), []);
  const mats = useMemo(
    () =>
      GHOSTS.map(
        (g) =>
          new THREE.SpriteMaterial({
            map: glowTex,
            color: g.color,
            transparent: true,
            opacity: 0,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            depthTest: false,
          }),
      ),
    [glowTex],
  );
  const refs = useRef<(THREE.Sprite | null)[]>([]);

  useEffect(
    () => () => {
      for (const m of mats) m.dispose();
      glowTex.dispose();
    },
    [mats, glowTex],
  );

  useFrame(() => {
    const aspect = size.width / Math.max(1, size.height);
    ndc.copy(sunWorld).project(camera);
    camSpace.copy(sunWorld).applyMatrix4(camera.matrixWorldInverse);
    const flare = (bodies.get('sun')?.uniforms?.uFlare?.value as number) ?? 0;
    const onScreen = camSpace.z < 0;
    const edge = Math.max(Math.abs(ndc.x), Math.abs(ndc.y));
    const fade = onScreen ? Math.max(0, Math.min(1, (1.7 - edge) / 0.65)) : 0;
    const boost = 0.55 + 0.9 * Math.min(1, flare);
    const halfH = Math.tan(((camera.fov / 2) * Math.PI) / 180);
    for (let i = 0; i < GHOSTS.length; i++) {
      const sprite = refs.current[i];
      if (!sprite) continue;
      const g = GHOSTS[i];
      place.set(-ndc.x * g.k * halfH * aspect, -ndc.y * g.k * halfH, -1.6);
      camera.localToWorld(place);
      sprite.position.copy(place);
      const s = g.size * 2 * halfH * 1.6;
      sprite.scale.set(s, s, 1);
      mats[i].opacity = fade * boost * g.opacity;
    }
  });

  return (
    <group name="lensFlare" renderOrder={7}>
      {GHOSTS.map((g, i) => (
        <sprite
          key={g.k}
          material={mats[i]}
          ref={(el) => {
            refs.current[i] = el;
          }}
          renderOrder={7}
        />
      ))}
    </group>
  );
}
