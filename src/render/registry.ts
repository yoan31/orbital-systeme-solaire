import * as THREE from 'three';
import type { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import type { Satellite } from '../astro/constants';

/* Registre des corps de la scène : les composants R3F créent les objets et
   déposent un descripteur ici ; la boucle (EphemerisDriver) et le rig caméra
   écrivent positions, échelles et uniforms sans passer par React. */
export interface BodyHandle {
  key: string;
  group: THREE.Group;
  axisGroup?: THREE.Group;
  mesh: THREE.Mesh;
  material: THREE.Material;
  uniforms?: Record<string, THREE.IUniform>;
  label?: CSS2DObject;
  radiusWorld: number;
  worldPos: THREE.Vector3;
  spin: number;
  poleWorld: THREE.Vector3;
  axisLine?: THREE.Line;
  rings?: THREE.Mesh;
  ringMaterial?: THREE.ShaderMaterial;
  clouds?: THREE.Mesh;
  atmosphere?: THREE.Mesh;
  weatherOverlay?: THREE.Mesh;
  glow?: THREE.Sprite;
  velocityArrow?: THREE.ArrowHelper;
  sat?: Satellite;
  comet?: boolean;
}

export const bodies = new Map<string, BodyHandle>();
export const satellites = new Map<string, BodyHandle>();

export function registerBody(handle: BodyHandle): void {
  bodies.set(handle.key, handle);
}

export function unregisterBody(key: string): void {
  bodies.delete(key);
}

export function registerSatellite(handle: BodyHandle): void {
  satellites.set(handle.key, handle);
  bodies.set(handle.key, handle);
}
