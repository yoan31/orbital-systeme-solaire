import * as THREE from 'three';
import { checkSubsolarReference, earthRotationAngle, latLonToVector3, subsolarPoint, sunDirectionWorld, vector3ToLatLon } from '../astro/earth';
import { normalizeDeg, radToDeg } from '../astro/kepler';
import { useStore } from '../state/store';
import { bodies } from './registry';

/* Mode debug éclairage : marqueurs 3D (créés par DebugLighting) et lecture des
   coordonnées dans la fiche. Uniquement latLonToVector3 / vector3ToLatLon,
   donc le même repère que les textures et les shaders. */
export const debugMarkers = {
  subsolar: null as THREE.Mesh | null,
  paris: null as THREE.Mesh | null,
  greenwich: null as THREE.Mesh | null,
  hudKey: '',
  asserts: [] as { ok: boolean }[],
};

const tmpV = new THREE.Vector3();
const sub = { lat: 0, lon: 0 };
const sun = { x: 0, y: 0, z: 0 };

function formatGeo(lat: number, lon: number): string {
  const la = `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'}`;
  const lo = `${Math.abs(lon).toFixed(2)}°${lon >= 0 ? 'E' : 'O'}`;
  return `${la} · ${lo}`;
}

export function updateLightingDebug(jd: number, camera: THREE.Camera): void {
  if (!useStore.getState().debugLight) return;
  subsolarPoint(jd, sub);
  sunDirectionWorld(jd, sun);
  if (debugMarkers.subsolar) latLonToVector3(sub.lat, sub.lon, 1.02, debugMarkers.subsolar.position);
  const earth = bodies.get('earth');
  const nadir = { lat: 0, lon: 0 };
  if (earth) {
    tmpV.copy(camera.position);
    earth.mesh.worldToLocal(tmpV);
    vector3ToLatLon(tmpV, nadir);
  }
  const era = normalizeDeg(radToDeg(earthRotationAngle(jd)));
  const key = `${sub.lat.toFixed(2)}${sub.lon.toFixed(2)}${nadir.lat.toFixed(2)}${nadir.lon.toFixed(2)}${era.toFixed(2)}`;
  if (key === debugMarkers.hudKey) return;
  debugMarkers.hudKey = key;
  useStore.getState().setDebugHud({
    subsolar: formatGeo(sub.lat, sub.lon),
    era: `${era.toFixed(2)}°`,
    nadir: formatGeo(nadir.lat, nadir.lon),
    sunDir: `x ${sun.x.toFixed(3)} · y ${sun.y.toFixed(3)} · z ${sun.z.toFixed(3)}`,
  });
}

/* Activation : assertions subsolaires exécutées comme dans le moteur d'origine. */
export function runDebugAssertions(): void {
  debugMarkers.asserts = checkSubsolarReference(true);
  debugMarkers.hudKey = '';
  const ok = debugMarkers.asserts.filter((r) => r.ok).length;
  useStore.getState().setDebugHud({ assertsOk: ok, assertsTotal: debugMarkers.asserts.length });
}
