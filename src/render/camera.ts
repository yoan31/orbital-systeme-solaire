import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { COMET_KEYS } from '../astro/constants';
import { satelliteEphemeris } from '../state/ephemeris';
import { registerFocus, useStore } from '../state/store';
import { bodies } from './registry';
import { maxSystemRadius } from './scales';

/* Contrat avec les composants R3F : CameraRig dépose la caméra et les
   contrôles ici au montage, puis appelle updateCamera à chaque image. */
export const view = {
  camera: null as THREE.PerspectiveCamera | null,
  controls: null as OrbitControlsImpl | null,
};

const UP = new THREE.Vector3(0, 1, 0);
const tmpV = new THREE.Vector3();
const tmpV2 = new THREE.Vector3();
const tmpOffset = new THREE.Vector3();
const zero = new THREE.Vector3();

const camTween = {
  active: false,
  t: 0,
  dur: 1.15,
  bodyKey: null as string | null,
  fromPos: new THREE.Vector3(),
  toPos: new THREE.Vector3(),
  fromTarget: new THREE.Vector3(),
  toTarget: new THREE.Vector3(),
  offset: new THREE.Vector3(),
  pendingFollow: null as string | null,
};
const prevFollowPos = new THREE.Vector3();
const COMET_KEYS_SET = new Set<string>(COMET_KEYS);

function easeInOutCubic(x: number): number {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

function beginTween(): void {
  camTween.active = true;
  camTween.t = 0;
  if (view.controls) view.controls.enabled = false;
}

export function focusBody(key: string): void {
  const camera = view.camera;
  const controls = view.controls;
  const obj = bodies.get(key);
  if (!camera || !controls || !obj) return;
  const mode = useStore.getState().mode;
  let r = obj.radiusWorld || 1;
  if (key === 'saturn' && obj.rings) r *= 2.3;
  if (key === 'uranus' && obj.rings) r *= 1.9;
  let dist: number;
  if (key === 'sun') dist = mode === 'real' ? r * 5.0 : r * 3.2;
  else if (COMET_KEYS_SET.has(key)) dist = mode === 'real' ? 0.16 : 3.2;
  else if (key === 'moon' || satelliteEphemeris[key]) dist = mode === 'real' ? Math.max(r * 9.0, 0.03) : Math.max(r * 9.0, 2.4);
  else dist = mode === 'real' ? Math.max(r * 8.0, 0.035) : Math.max(r * 4.6, 1.1);
  if (key === 'sun') {
    tmpV.copy(camera.position).sub(controls.target);
    if (tmpV.lengthSq() < 1e-9) tmpV.set(0.55, 0.35, 1);
    tmpV.normalize();
  } else {
    // Vue 3/4 éclairée : caméra côté Soleil, légèrement au-dessus de l'écliptique.
    tmpV.copy(obj.worldPos).normalize().multiplyScalar(-1);
    tmpV2.set(0, 1, 0);
    if (Math.abs(tmpV.dot(tmpV2)) > 0.94) tmpV2.set(1, 0, 0);
    tmpOffset.crossVectors(tmpV, tmpV2).normalize();
    tmpV.multiplyScalar(0.88).addScaledVector(tmpOffset, 0.36).addScaledVector(UP, 0.34).normalize();
    if (key === 'saturn') tmpV.addScaledVector(UP, 0.18).normalize();
  }
  camTween.offset.copy(tmpV).multiplyScalar(dist);
  camTween.fromPos.copy(camera.position);
  camTween.fromTarget.copy(controls.target);
  camTween.toTarget.copy(obj.worldPos);
  camTween.toPos.copy(obj.worldPos).add(camTween.offset);
  camTween.bodyKey = key;
  camTween.pendingFollow = key;
  camTween.dur = 1.15;
  useStore.setState({ follow: null });
  beginTween();
}

function tweenToView(pos: THREE.Vector3, target: THREE.Vector3): void {
  const camera = view.camera;
  const controls = view.controls;
  if (!camera || !controls) return;
  camTween.fromPos.copy(camera.position);
  camTween.fromTarget.copy(controls.target);
  camTween.toPos.copy(pos);
  camTween.toTarget.copy(target);
  camTween.bodyKey = null;
  camTween.pendingFollow = null;
  camTween.offset.set(0, 0, 0);
  camTween.dur = 1.2;
  useStore.setState({ follow: null });
  beginTween();
}

registerFocus(focusBody);

export function viewTop(): void {
  const R = maxSystemRadius();
  tmpV.set(0, R, R * 0.16);
  tweenToView(tmpV, zero);
}

export function viewSide(): void {
  const R = maxSystemRadius();
  tmpV.set(R, R * 0.12, 0);
  tweenToView(tmpV, zero);
}

export function viewFromEarth(): void {
  const earth = bodies.get('earth');
  const camera = view.camera;
  if (!earth || !camera) return;
  const mode = useStore.getState().mode;
  // Caméra juste au-dessus de la face éclairée de la Terre, regardant le Soleil.
  tmpV.copy(earth.worldPos).normalize().multiplyScalar(-1);
  const off = Math.max(earth.radiusWorld * 2.2, mode === 'real' ? 0.03 : 0.2);
  tmpV2.copy(earth.worldPos).addScaledVector(tmpV, off);
  tmpV2.y += earth.radiusWorld * 0.65;
  tweenToView(tmpV2, zero);
}

export function setFollow(key: string | null): void {
  const controls = view.controls;
  if (!key) {
    useStore.setState({ follow: null });
    if (controls) controls.enablePan = true;
    return;
  }
  const obj = bodies.get(key);
  if (!obj || !controls) return;
  useStore.setState({ follow: key });
  prevFollowPos.copy(obj.worldPos);
  controls.target.copy(prevFollowPos);
  controls.enablePan = false;
}

export function updateCamera(dt: number, skyGroup: THREE.Object3D | null): void {
  const camera = view.camera;
  const controls = view.controls;
  if (!camera || !controls) return;
  if (camTween.active) {
    camTween.t += dt / camTween.dur;
    const t = Math.min(1, camTween.t);
    const k = easeInOutCubic(t);
    if (camTween.bodyKey) {
      const obj = bodies.get(camTween.bodyKey);
      if (obj) {
        camTween.toTarget.copy(obj.worldPos);
        camTween.toPos.copy(obj.worldPos).add(camTween.offset);
      }
    }
    camera.position.lerpVectors(camTween.fromPos, camTween.toPos, k);
    controls.target.lerpVectors(camTween.fromTarget, camTween.toTarget, k);
    camera.lookAt(controls.target);
    if (t >= 1) {
      camTween.active = false;
      controls.enabled = true;
      if (camTween.pendingFollow) {
        const key = camTween.pendingFollow;
        const obj = bodies.get(key);
        useStore.setState({ follow: key });
        if (obj) {
          prevFollowPos.copy(obj.worldPos);
          controls.target.copy(prevFollowPos);
        }
        controls.enablePan = false;
      } else {
        controls.enablePan = true;
      }
      controls.update();
    }
  } else {
    const follow = useStore.getState().follow;
    if (follow) {
      const obj = bodies.get(follow);
      if (obj) {
        tmpV.copy(obj.worldPos).sub(prevFollowPos);
        camera.position.add(tmpV);
        controls.target.copy(obj.worldPos);
        prevFollowPos.copy(obj.worldPos);
      }
    }
    controls.update();
  }
  if (skyGroup) skyGroup.position.copy(camera.position);
}
