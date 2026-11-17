import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { QUALITY_TIERS } from '../astro/quality';
import { useStore } from '../state/store';
import { registerBody } from '../render/registry';
import type { BodyHandle } from '../render/registry';
import { makeLabel } from '../render/labels';
import { createAtmoMaterial, createCloudMaterial, createEarthMaterial, createWeatherOverlayMaterial } from '../shaders/materials';
import { useTextures } from '../textures/context';
import { earthWeather } from '../services/earthWeather';
import { geoHigh, geoLow } from './geometry';
import { Moon } from './Moon';

function makeTransparentTexture(): THREE.DataTexture {
  const data = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0]);
  const tex = new THREE.DataTexture(data, 2, 2, THREE.RGBAFormat);
  tex.needsUpdate = true;
  return tex;
}

export function Earth() {
  const tex = useTextures();
  const tier = useStore((s) => s.tier);
  const atmospheres = useStore((s) => s.layers.atmospheres);
  const highGeo = QUALITY_TIERS[tier].highGeo;

  const group = useRef<THREE.Group>(null);
  const axisGroup = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.Mesh>(null);
  const clouds = useRef<THREE.Mesh>(null);
  const atmosphere = useRef<THREE.Mesh>(null);
  const overlay = useRef<THREE.Mesh>(null);

  const material = useMemo(() => createEarthMaterial(tex), [tex]);
  const cloudMaterial = useMemo(() => createCloudMaterial(tex), [tex]);
  const atmoMaterial = useMemo(() => createAtmoMaterial(0x4a9eff, 1.15, 0x6fa8ff), []);
  const blank = useMemo(() => makeTransparentTexture(), []);
  const overlayMaterial = useMemo(() => createWeatherOverlayMaterial(blank, tex.earthClouds), [blank, tex]);
  const label = useMemo(() => makeLabel('Terre', 'earth'), []);
  const geometry = highGeo ? geoHigh : geoLow;

  useEffect(() => {
    const g = group.current;
    const ag = axisGroup.current;
    const m = mesh.current;
    if (!g || !ag || !m) return;
    const handle: BodyHandle = {
      key: 'earth',
      group: g,
      axisGroup: ag,
      mesh: m,
      material,
      uniforms: material.uniforms as Record<string, THREE.IUniform>,
      label,
      radiusWorld: 1,
      worldPos: g.position,
      spin: 0,
      poleWorld: new THREE.Vector3(0, 1, 0),
      clouds: clouds.current ?? undefined,
      atmosphere: atmosphere.current ?? undefined,
      weatherOverlay: overlay.current ?? undefined,
    };
    registerBody(handle);
  }, [material, label]);

  /* Synchronisation de la couche météo : la texture et l'opacité sont
     possédées par le service, le mesh par la scène. */
  useFrame(() => {
    const o = overlay.current;
    if (!o) return;
    const u = overlayMaterial.uniforms;
    if (earthWeather.texture && u.uMap.value !== earthWeather.texture) {
      u.uMap.value = earthWeather.texture;
      overlayMaterial.needsUpdate = true;
    }
    u.uOpacity.value = earthWeather.overlayOpacity;
    u.uCloudOnly.value = earthWeather.cloudOnly;
    o.visible = earthWeather.active && useStore.getState().layers.earthWeather;
  });

  useEffect(
    () => () => {
      material.dispose();
      cloudMaterial.dispose();
      atmoMaterial.dispose();
      overlayMaterial.dispose();
      blank.dispose();
    },
    [material, cloudMaterial, atmoMaterial, overlayMaterial, blank],
  );

  return (
    <group ref={group} name="earth">
      <group ref={axisGroup}>
        <mesh
          ref={mesh}
          geometry={geometry}
          material={material}
          onClick={(e) => {
            e.stopPropagation();
            const point = e.point;
            useStore.getState().select('earth', true);
            const local = mesh.current ? mesh.current.worldToLocal(point.clone()) : null;
            if (local) earthWeather.onClick(local);
          }}
          onPointerOver={() => {
            document.body.style.cursor = 'pointer';
          }}
          onPointerOut={() => {
            document.body.style.cursor = '';
          }}
        />
        <mesh ref={clouds} geometry={geometry} material={cloudMaterial} visible={atmospheres} />
        <mesh ref={atmosphere} geometry={geometry} material={atmoMaterial} visible={atmospheres} />
        <mesh ref={overlay} geometry={geometry} material={overlayMaterial} renderOrder={2} />
      </group>
      <primitive object={label} position={[0, 1.18, 0]} />
      <Moon />
    </group>
  );
}
