import * as THREE from 'three';
import {
  AU_KM,
  AU_UNITS_REAL,
  COMETS,
  COMET_BY_KEY,
  J2000,
  PED,
  SATELLITES,
} from '../astro/constants';
import { BODY_INFO, PLANET_KEYS } from '../astro/info';
import { cometState, degToRad, planetHelioAU, radToDeg, satelliteOffsetAU } from '../astro/kepler';
import { earthMoonState } from '../astro/moon';
import { earthPoleEcl, earthRotationAngle, eqToEcl, iauOrientation } from '../astro/earth';
import { useStore } from '../state/store';
import { clock } from '../state/clock';
import { ephemeris, moonGeo, satelliteEphemeris, scratch } from '../state/ephemeris';
import type { MoonInfo } from '../state/store';
import { bodies, satellites as satelliteHandles } from './registry';
import type { BodyHandle } from './registry';
import { auToWorld, smoothstep, visualRadiusFor, visualRadiusSatellite } from './scales';
import { beltUniforms } from '../shaders/materials';
import { orbitElements, updateOrbitLines } from '../scene/Orbits';
import { bgRefs } from '../scene/bg';
import { velocityArrows } from '../scene/VelocityArrows';
import { postfx } from './postfx';
import { solarWeather } from '../services/solarWeather';

const UP = new THREE.Vector3(0, 1, 0);
const { v: tmpV, v2: tmpV2, v3: tmpV3, quat: tmpQuat } = scratch;
const zero = scratch.zero;

export const moonInfo: MoonInfo = { illum: 0, elongDeg: 0, phase: '', waxing: true, solar: '', lunar: '', umbraFactor: 0 };

export function updateEphemeris(jd: number): void {
  for (const key of PLANET_KEYS) planetHelioAU(key, jd, ephemeris[key] as never);
  earthMoonState(jd, ephemeris.earth as never, moonGeo as never);
  for (const sat of SATELLITES) {
    iauOrientation(sat.parent, jd, scratch.orient as never);
    scratch.poleEq.x = scratch.orient.poleEqX as number;
    scratch.poleEq.y = scratch.orient.poleEqY as number;
    scratch.poleEq.z = scratch.orient.poleEqZ as number;
    const out = satelliteEphemeris[sat.key];
    satelliteOffsetAU(sat, jd, scratch.poleEq, out as never);
    const parent = ephemeris[sat.parent];
    out.wx = parent.x + out.x;
    out.wy = parent.y + out.y;
    out.wz = parent.z + out.z;
    out.distEarthAU = Math.sqrt(
      (out.wx - ephemeris.earth.x) ** 2 + (out.wy - ephemeris.earth.y) ** 2 + (out.wz - ephemeris.earth.z) ** 2,
    );
    out.speed = (2 * Math.PI * sat.aKm) / (Math.abs(sat.periodDays) * 86400);
  }
  for (const c of COMETS) cometState(c, jd, ephemeris[c.key] as never);
  const ex = ephemeris.earth.x;
  const ey = ephemeris.earth.y;
  const ez = ephemeris.earth.z;
  for (const key of PLANET_KEYS) {
    const st = ephemeris[key];
    st.distEarthAU = Math.sqrt((st.x - ex) ** 2 + (st.y - ey) ** 2 + (st.z - ez) ** 2);
    st.sunDistAU = st.r;
  }
  moonGeo.distEarthAU = moonGeo.distKm / AU_KM;
  for (const c of COMETS) {
    const st = ephemeris[c.key];
    st.distEarthAU = Math.sqrt((st.x - ex) ** 2 + (st.y - ey) ** 2 + (st.z - ez) ** 2);
  }
}

export function applyScales(): void {
  const mode = useStore.getState().mode;
  const sun = bodies.get('sun');
  if (sun) {
    const sunR = visualRadiusFor('sun');
    sun.radiusWorld = sunR;
    sun.mesh.scale.setScalar(sunR);
    if (sun.glow) sun.glow.scale.setScalar(sunR * 2.45);
    if (sun.label) sun.label.position.y = sunR * 1.35;
  }
  for (const key of PLANET_KEYS) {
    const obj = bodies.get(key);
    if (!obj) continue;
    const r = visualRadiusFor(key);
    obj.radiusWorld = r;
    obj.mesh.scale.setScalar(r);
    if (obj.axisLine) obj.axisLine.scale.set(1, r * 4.6, 1);
    if (obj.label) obj.label.position.y = r * 1.18 + (mode === 'real' ? Math.max(r * 0.35, 0.005) : 0.08);
    if (obj.clouds) obj.clouds.scale.setScalar(r * 1.008);
    if (obj.atmosphere) obj.atmosphere.scale.setScalar(r * 1.025);
    if (obj.weatherOverlay) obj.weatherOverlay.scale.setScalar(r * 1.004);
    if (obj.rings) obj.rings.scale.setScalar(r);
  }
  const moon = bodies.get('moon');
  if (moon) {
    const mr = mode === 'real' ? (1737.4 / AU_KM) * AU_UNITS_REAL : PED.satelliteRadius * PED.radiusScale * Math.pow(1737.4 / 6371, PED.radiusPower);
    moon.radiusWorld = mr;
    moon.mesh.scale.setScalar(mr);
    if (moon.label) moon.label.position.y = mr * 1.25 + (mode === 'real' ? 0.004 : 0.08);
  }
  for (const sat of SATELLITES) {
    const obj = satelliteHandles.get(sat.key);
    if (!obj) continue;
    const r = visualRadiusSatellite(sat);
    obj.radiusWorld = r;
    obj.mesh.scale.setScalar(r);
    if (obj.label) obj.label.position.y = r * 1.55 + (mode === 'real' ? 0.003 : 0.07);
  }
  for (const c of COMETS) {
    const obj = bodies.get(c.key);
    if (!obj) continue;
    obj.radiusWorld = mode === 'real' ? 0.0008 : 0.05;
    obj.mesh.scale.setScalar(obj.radiusWorld);
    if (obj.glow) obj.glow.scale.setScalar(mode === 'real' ? 0.012 : 0.32);
    if (obj.label) obj.label.position.y = obj.radiusWorld * 2.5 + (mode === 'real' ? 0.01 : 0.3);
  }
}

export function applyPositions(): void {
  const mode = useStore.getState().mode;
  for (const key of PLANET_KEYS) {
    const st = ephemeris[key];
    const obj = bodies.get(key);
    if (!obj) continue;
    auToWorld(st.x, st.y, st.z, tmpV);
    obj.group.position.copy(tmpV);
    obj.worldPos.copy(tmpV);
  }
  const earth = bodies.get('earth');
  const moon = bodies.get('moon');
  if (earth && moon) {
    // Lune : position géocentrique (km, écliptique J2000) -> repère local Terre.
    tmpV2.set(moonGeo.gx, moonGeo.gz, -moonGeo.gy).normalize();
    const moonLocalR =
      mode === 'real'
        ? (moonGeo.distKm / AU_KM) * AU_UNITS_REAL
        : earth.radiusWorld * Math.max(1.9, 1.55 + 1.05 * Math.log10(Math.max(moonGeo.distKm / 6371, 1)));
    moon.group.position.copy(tmpV2).multiplyScalar(moonLocalR);
    moon.worldPos.copy(earth.worldPos).add(moon.group.position);
    moon.mesh.rotation.y = Math.atan2(moon.group.position.x, moon.group.position.z) + Math.PI;
  }
  for (const sat of SATELLITES) {
    const obj = satelliteHandles.get(sat.key);
    if (!obj) continue;
    const off = satelliteEphemeris[sat.key];
    tmpV2.set(off.x, off.z, -off.y).normalize();
    const parent = bodies.get(sat.parent);
    if (!parent) continue;
    const rLocal =
      mode === 'real'
        ? off.r * AU_UNITS_REAL
        : parent.radiusWorld * Math.max(1.9, 1.55 + 1.05 * Math.log10(Math.max(off.distKm / BODY_INFO[sat.parent].radiusKm, 1)));
    tmpV3.copy(tmpV2).multiplyScalar(rLocal);
    obj.group.position.copy(tmpV3);
    obj.worldPos.copy(parent.worldPos).add(tmpV3);
    obj.mesh.rotation.y = Math.atan2(-tmpV3.x, -tmpV3.z);
  }
  for (const c of COMETS) {
    const st = ephemeris[c.key];
    const obj = bodies.get(c.key);
    if (!obj) continue;
    auToWorld(st.x, st.y, st.z, tmpV);
    obj.group.position.copy(tmpV);
    obj.worldPos.copy(tmpV);
    if (obj.glow) obj.glow.material.opacity = Math.min(0.9, 0.35 + 4.0 / Math.max(st.r * st.r, 0.2));
  }
}

export function updateMoonEvents(): void {
  const e = ephemeris.earth;
  const sx = -e.x;
  const sy = -e.y;
  const sz = -e.z;
  const sl = Math.sqrt(sx * sx + sy * sy + sz * sz);
  const sux = sx / sl;
  const suy = sy / sl;
  const suz = sz / sl;
  const mx = moonGeo.gx;
  const my = moonGeo.gy;
  const mz = moonGeo.gz;
  const ml = Math.sqrt(mx * mx + my * my + mz * mz);
  const mux = mx / ml;
  const muy = my / ml;
  const muz = mz / ml;
  const cosElong = Math.max(-1, Math.min(1, sux * mux + suy * muy + suz * muz));
  const elong = Math.acos(cosElong);
  const illum = (1 - cosElong) / 2;
  const waxing = sux * muy - suy * mux > 0;
  // Géométrie de l'ombre : distance de l'axe Soleil-Lune au centre de la Terre.
  const axisMissKm = moonGeo.distKm * Math.sin(elong);
  const sunMoonKm = Math.max(e.r * AU_KM - moonGeo.distKm * Math.cos(elong), 1e7);
  const umbraSignedKm = 1737.4 - ((696340 - 1737.4) * moonGeo.distKm) / sunMoonKm;
  const penumbraKm = 1737.4 + ((696340 + 1737.4) * moonGeo.distKm) / sunMoonKm;

  let solar = '';
  if (cosElong > 0 && axisMissKm < 6371 + penumbraKm) {
    if (axisMissKm < 6371 + Math.abs(umbraSignedKm)) {
      solar = umbraSignedKm >= 0 ? 'Éclipse totale de Soleil' : 'Éclipse annulaire de Soleil';
    } else {
      solar = 'Éclipse partielle de Soleil';
    }
  }

  const ax = -sux;
  const ay = -suy;
  const az = -suz;
  const t = mx * ax + my * ay + mz * az;
  let lunar = '';
  let umbraFactor = 0;
  if (t > 0) {
    const perp = Math.sqrt(Math.max(0, ml * ml - t * t));
    const umbraLength = 1384000;
    const umbraR = 6371 * Math.max(0, 1 - t / umbraLength);
    umbraFactor = 1 - smoothstep(umbraR - 1737.4, umbraR + 1737.4, perp);
    if (perp < umbraR + 1737.4) lunar = perp < umbraR - 1737.4 ? 'Éclipse totale de Lune' : 'Éclipse partielle de Lune';
  }
  let phase: string;
  const ed = radToDeg(elong);
  if (ed < 7) phase = 'Nouvelle lune';
  else if (ed < 83) phase = waxing ? 'Premier croissant' : 'Dernier croissant';
  else if (ed < 97) phase = waxing ? 'Premier quartier' : 'Dernier quartier';
  else if (ed < 173) phase = waxing ? 'Gibbeuse croissante' : 'Gibbeuse décroissante';
  else phase = 'Pleine lune';

  moonInfo.illum = illum;
  moonInfo.elongDeg = ed;
  moonInfo.phase = phase;
  moonInfo.waxing = waxing;
  moonInfo.solar = solar;
  moonInfo.lunar = lunar;
  moonInfo.umbraFactor = umbraFactor;

  const moon = bodies.get('moon');
  if (moon?.uniforms) {
    moon.uniforms.uEclipse.value = umbraFactor;
    const earth = bodies.get('earth');
    if (earth) (moon.uniforms.uEarthPos.value as THREE.Vector3).copy(earth.worldPos);
  }
}

export function updateSpins(jd: number, camera: THREE.Camera): void {
  for (const key of PLANET_KEYS) {
    const obj = bodies.get(key);
    if (!obj) continue;
    if (key === 'earth') {
      // Pôle réel (précession incluse) et angle de rotation ERA : même axe et
      // même angle pour la sphère, les nuages et l'atmosphère.
      earthPoleEcl(jd, scratch.ecl as never);
      tmpV.set(scratch.ecl.x, scratch.ecl.z, -scratch.ecl.y).normalize();
      obj.spin = earthRotationAngle(jd);
    } else {
      iauOrientation(key, jd, scratch.orient as never);
      scratch.poleEq.x = scratch.orient.poleEqX as number;
      scratch.poleEq.y = scratch.orient.poleEqY as number;
      scratch.poleEq.z = scratch.orient.poleEqZ as number;
      eqToEcl(scratch.poleEq.x, scratch.poleEq.y, scratch.poleEq.z, scratch.ecl as never);
      tmpV.set(scratch.ecl.x, scratch.ecl.z, -scratch.ecl.y).normalize();
      obj.spin = degToRad(scratch.orient.W as number);
    }
    tmpQuat.setFromUnitVectors(UP, tmpV);
    if (obj.axisGroup) obj.axisGroup.quaternion.copy(tmpQuat);
    obj.poleWorld.copy(tmpV);
    obj.mesh.rotation.y = obj.spin;
    if (obj.axisLine) {
      const camDist = camera.position.distanceTo(obj.worldPos);
      const axisLen = useStore.getState().mode === 'real' ? obj.radiusWorld * 4.6 : Math.max(obj.radiusWorld * 4.6, camDist * 0.022);
      obj.axisLine.scale.set(1, axisLen, 1);
    }
    if (key === 'earth') {
      if (obj.clouds) obj.clouds.rotation.y = obj.spin;
      if (obj.atmosphere) obj.atmosphere.rotation.y = obj.spin;
    }
    if (key === 'venus' && obj.clouds) obj.clouds.rotation.y = obj.spin * 0.12 + (jd - J2000) * 0.22;
  }
  const sun = bodies.get('sun');
  if (sun) {
    sun.mesh.rotation.y = (jd - J2000) * ((Math.PI * 2) / 25.38);
    if (sun.uniforms) sun.uniforms.uSunSpin.value = (jd - J2000) * ((Math.PI * 2) / 25.38);
  }
}

function setVector(uniform: THREE.IUniform | undefined, value: THREE.Vector3): void {
  if (uniform) (uniform.value as THREE.Vector3).copy(value);
}

export function updateUniforms(jd: number): void {
  const sun = bodies.get('sun');
  const earth = bodies.get('earth');
  const saturn = bodies.get('saturn');
  const moon = bodies.get('moon');
  const mode = useStore.getState().mode;
  if (sun?.uniforms) {
    sun.uniforms.uTime.value = clock.timeElapsed;
    // Activité solaire NOAA : luminosité, taches, éruption localisée, teinte SDO.
    sun.uniforms.uActivity.value = solarWeather.activity;
    sun.uniforms.uSunspots.value = solarWeather.sunspots;
    sun.uniforms.uFlare.value = solarWeather.flare;
    (sun.uniforms.uFlareUv.value as THREE.Vector2).set(solarWeather.flareUv.x, solarWeather.flareUv.y);
    (sun.uniforms.uWaveTint.value as THREE.Color).setRGB(solarWeather.waveTint[0], solarWeather.waveTint[1], solarWeather.waveTint[2]);
  }
  if (postfx.chain?.bloom) postfx.chain.bloom.intensity = postfx.bloomBase * (1 + 0.55 * solarWeather.activity);
  beltUniforms.uT.value = jd - J2000;
  beltUniforms.uMode.value = mode === 'real' ? 0 : 1;
  beltUniforms.uPedScale.value = PED.distScale;
  beltUniforms.uPedPower.value = PED.distPower;
  beltUniforms.uRealScale.value = AU_UNITS_REAL;

  if (saturn?.uniforms) {
    setVector(saturn.uniforms.uPlanetPos, saturn.worldPos);
    setVector(saturn.uniforms.uRingNormal, saturn.poleWorld);
    saturn.uniforms.uRingInner.value = saturn.radiusWorld * 1.24;
    saturn.uniforms.uRingOuter.value = saturn.radiusWorld * 2.36;
  }
  if (saturn?.ringMaterial) {
    const u = saturn.ringMaterial.uniforms;
    setVector(u.uPlanetPos, saturn.worldPos);
    setVector(u.uRingNormal, saturn.poleWorld);
    u.uPlanetRadius.value = saturn.radiusWorld;
    u.uInner.value = saturn.radiusWorld * 1.24;
    u.uOuter.value = saturn.radiusWorld * 2.36;
  }
  if (moon?.uniforms) {
    setVector(moon.uniforms.uSunPos, zero);
    if (earth) setVector(moon.uniforms.uEarthPos, earth.worldPos);
    moon.uniforms.uEclipse.value = moonInfo.umbraFactor;
  }
  const earthIllum = mode === 'real' ? 1 / Math.max(ephemeris.earth.r * ephemeris.earth.r, 1e-8) : 1;
  if (earth) {
    // Le Soleil est à l'origine du monde : uSunPos est en repère monde, comme
    // les normales des shaders ; indépendant de la caméra et du mode Suivre.
    if (earth.uniforms) {
      setVector(earth.uniforms.uSunPos, zero);
      if (earth.uniforms.uIllum) earth.uniforms.uIllum.value = earthIllum;
    }
    if (earth.clouds) {
      const u = (earth.clouds.material as THREE.ShaderMaterial).uniforms;
      setVector(u.uSunPos, zero);
      u.uIllum.value = earthIllum;
    }
    if (earth.atmosphere) {
      const u = (earth.atmosphere.material as THREE.ShaderMaterial).uniforms;
      setVector(u.uSunPos, zero);
      u.uIllum.value = earthIllum;
    }
    if (earth.weatherOverlay) {
      const u = (earth.weatherOverlay.material as THREE.ShaderMaterial).uniforms;
      setVector(u.uSunPos, zero);
    }
  }
  // Atmosphères des autres planètes : même convention de repère que la Terre.
  for (const key of PLANET_KEYS) {
    const obj = bodies.get(key);
    if (!obj?.atmosphere) continue;
    const u = (obj.atmosphere.material as THREE.ShaderMaterial).uniforms;
    setVector(u.uSunPos, zero);
    const rAU = ephemeris[key]?.r ?? 1;
    if (u.uIllum) u.uIllum.value = mode === 'real' ? 1 / Math.max(rAU * rAU, 1e-8) : 1;
  }
  if (moon?.uniforms) moon.uniforms.uIllum.value = earthIllum;
  const satIllum = mode === 'real' ? 1 / Math.max(ephemeris.saturn.r * ephemeris.saturn.r, 1e-8) : 1;
  if (saturn?.uniforms?.uIllum) saturn.uniforms.uIllum.value = satIllum;
  if (saturn?.ringMaterial) saturn.ringMaterial.uniforms.uIllum.value = satIllum;
}

export function updateVelocities(camera: THREE.Camera): void {
  const s = useStore.getState();
  if (!s.layers.velocity) return;
  const mode = s.mode;
  for (const key of velocityArrows.keys()) {
    const arrow = velocityArrows.get(key);
    const obj = bodies.get(key);
    if (!arrow || !obj) continue;
    if (!s.layers.comets && COMET_BY_KEY[key]) {
      arrow.visible = false;
      continue;
    }
    arrow.visible = true;
    const st = ephemeris[key];
    const camDist = camera.position.distanceTo(obj.worldPos);
    const len = mode === 'real' ? Math.max(obj.radiusWorld * 6.0, 0.006) : Math.max(obj.radiusWorld * 4.5, camDist * 0.03);
    tmpV2.set(st.vx, st.vz, -st.vy);
    if (tmpV2.lengthSq() < 1e-30) continue;
    tmpV2.normalize();
    arrow.position.copy(obj.worldPos);
    arrow.setDirection(tmpV2);
    arrow.setLength(len, len * 0.24, len * 0.1);
  }
}

/* Exposition adaptative : identique au moteur d'origine, appliquée en HDR avant
   le tone mapping ACES. */
export function updateExposure(dt: number): void {
  let target = 1.15;
  if (useStore.getState().mode === 'real') {
    let rAU = 1;
    const sel = useStore.getState().selected;
    if (sel === 'moon' || sel === 'earth') rAU = ephemeris.earth.r;
    else if (sel === 'sun') rAU = 1;
    else if (ephemeris[sel]) rAU = ephemeris[sel].r;
    else if (satelliteEphemeris[sel]) {
      const parent = BODY_INFO[sel].parent as string;
      rAU = ephemeris[parent].r;
    }
    target = Math.max(0.12, Math.min(700, rAU * rAU * 1.15));
  }
  postfx.exposure += (target - postfx.exposure) * Math.min(1, dt * 3.2);
  if (postfx.chain) postfx.chain.exposure.exposure = postfx.exposure;
}

export function updateOrbitVisibility(camera: THREE.Camera): void {
  const s = useStore.getState();
  const group = bgRefs.orbitGroup;
  for (const key of Object.keys(orbitElements)) {
    const entry = orbitElements[key];
    if (!entry?.line) continue;
    const obj = bodies.get(s.selected);
    const close = !!(obj && camera.position.distanceTo(obj.worldPos) < obj.radiusWorld * 20);
    entry.line.visible = s.layers.orbits && (!close || !!COMET_BY_KEY[s.selected]) && (s.layers.comets || !COMET_BY_KEY[key]);
  }
  void group;
  if (bgRefs.gridGroup) {
    const obj = bodies.get(s.selected);
    const close = !!(obj && camera.position.distanceTo(obj.worldPos) < obj.radiusWorld * 20);
    bgRefs.gridGroup.visible = s.layers.grid && !close;
  }
}

/* God rays : opacité proportionnelle à la visibilité du Soleil à l'écran.
   Hors champ, l'effet dérive (position projetée bornée) et laisse des halos
   rectangulaires ; on le coupe donc proprement. */
export function updateGodRays(camera: THREE.Camera): void {
  const godRays = postfx.chain?.godRays;
  if (!godRays) return;
  tmpV.set(0, 0, 0).project(camera);
  const off = Math.max(Math.abs(tmpV.x), Math.abs(tmpV.y));
  const behind = tmpV.z > 1 || tmpV.z < -1;
  const fade = behind ? 0 : Math.max(0, Math.min(1, (1.25 - off) / 0.35));
  godRays.blendMode.opacity.value = fade;
}

/* Focus du depth of field : distance caméra ↔ corps suivi (ou sélectionné). */
export function updateDofFocus(camera: THREE.Camera): void {
  const dof = postfx.chain?.dof;
  if (!dof) return;
  const s = useStore.getState();
  const key = s.follow ?? s.selected;
  const obj: BodyHandle | undefined = bodies.get(key);
  if (!obj) return;
  const dist = camera.position.distanceTo(obj.worldPos);
  dof.focus = Math.max(dist, 1e-4);
  dof.range = Math.max(obj.radiusWorld * 4, dist * 0.3, 1e-3);
}

export function refreshOrbits(jd: number): void {
  updateOrbitLines(jd);
}
