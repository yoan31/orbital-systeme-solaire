import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import * as THREE from 'three';
import { COMET_KEYS } from '../astro/constants';
import { bodies } from './registry';
import { useStore } from '../state/store';

/* Étiquettes CSS2D : markup et interactions identiques au moteur d'origine.
   La visibilité (occlusion écran, priorité de chevauchement) est calculée par
   la boucle, comme avant. */
export function makeLabel(text: string, key: string, minor = false): CSS2DObject {
  const el = document.createElement('div');
  el.className = 'body-label' + (minor ? ' minor' : '');
  el.innerHTML = `<span class="lbl-dot"></span>${text}`;
  el.setAttribute('role', 'button');
  el.setAttribute('tabindex', '0');
  el.setAttribute('aria-label', `Sélectionner ${text}`);
  el.addEventListener('click', (ev) => {
    ev.stopPropagation();
    useStore.getState().select(key, true);
  });
  el.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      useStore.getState().select(key, true);
    }
  });
  const obj = new CSS2DObject(el);
  obj.center.set(0.5, 1);
  return obj;
}

const LABEL_ORDER = ['sun', 'earth', 'moon', 'jupiter', 'saturn', 'mars', 'venus', 'mercury', 'uranus', 'neptune', 'pluto', ...COMET_KEYS];
const COMET_SET = new Set<string>(COMET_KEYS);
const projTmp = new THREE.Vector3();

interface Shown {
  key: string;
  obj: { worldPos: THREE.Vector3; label?: CSS2DObject; group: THREE.Object3D };
  x: number;
  y: number;
}

/* Priorité : sélection, puis ordre ci-dessus ; on masque les chevauchements.
   Seuils et marges de l'implémentation d'origine. */
export function updateLabelVisibility(camera: THREE.Camera, mode: string): void {
  const s = useStore.getState();
  const L = s.layers;
  const width = window.innerWidth;
  const height = window.innerHeight;
  const labels: Shown[] = [];

  const add = (key: string, obj: { worldPos: THREE.Vector3; label?: CSS2DObject; group: THREE.Object3D; visible?: boolean } | undefined) => {
    if (!obj || !obj.label) return;
    if (!L.labels || (!L.comets && COMET_SET.has(key))) {
      obj.label.visible = false;
      return;
    }
    projTmp.copy(obj.worldPos).project(camera);
    if (projTmp.z < -1 || projTmp.z > 1) {
      obj.label.visible = false;
      return;
    }
    labels.push({ key, obj, x: (projTmp.x * 0.5 + 0.5) * width, y: (-projTmp.y * 0.5 + 0.5) * height });
  };

  for (const key of LABEL_ORDER) add(key, bodies.get(key));

  const threshold = mode === 'real' ? 6 : 120;
  for (const key of [...bodies.keys()]) {
    const obj = bodies.get(key);
    if (!obj || !obj.sat) continue;
    if (!(L.labels && L.satellites && camera.position.distanceTo(obj.worldPos) < threshold)) {
      if (obj.label) obj.label.visible = false;
      continue;
    }
    add(key, obj);
  }

  const accepted: Shown[] = [];
  const topSafe = 72;
  const bottomSafe = height - (width <= 980 ? 150 : 170);
  const marginX = width <= 980 ? 42 : 50;
  for (const item of labels) {
    let show = item.x > marginX && item.x < width - marginX && item.y - 20 > topSafe && item.y < bottomSafe;
    if (show && item.key !== s.selected) {
      for (const a of accepted) {
        if (Math.hypot(item.x - a.x, item.y - a.y) < (width <= 980 ? 34 : 44)) {
          show = false;
          break;
        }
      }
    }
    if (item.obj.label) item.obj.label.visible = show;
    if (show) accepted.push(item);
  }
}

/* Met en évidence l'étiquette sélectionnée (classe CSS de l'original). */
export function updateLabelSelection(selected: string): void {
  for (const [key, obj] of bodies) {
    const element = obj.label?.element;
    if (element) element.classList.toggle('selected', key === selected);
  }
}
