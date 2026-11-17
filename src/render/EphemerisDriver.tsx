import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { jdToDateParts } from '../astro/kepler';
import { nextTierDown, QUALITY_TIERS } from '../astro/quality';
import { clock } from '../state/clock';
import { useStore } from '../state/store';
import { bgRefs } from '../scene/bg';
import { updateCamera } from './camera';
import {
  applyPositions,
  applyScales,
  moonInfo,
  refreshOrbits,
  updateDofFocus,
  updateGodRays,
  updateEphemeris,
  updateExposure,
  updateMoonEvents,
  updateOrbitVisibility,
  updateSpins,
  updateUniforms,
  updateVelocities,
} from './frame';
import { updateLabelSelection, updateLabelVisibility } from './labels';
import { labelView } from './Labels';
import { postfx } from './postfx';
import { updateLightingDebug } from './lightDebug';
import { earthWeather } from '../services/earthWeather';
import { solarWeather } from '../services/solarWeather';

/* Boucle unique, priorité 1 : R3F ne rend plus automatiquement. Reproduit
   l'ordre des mises à jour du moteur d'origine, image par image. */
export function EphemerisDriver() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const acc = useRef({ lastUI: 0, lastInfo: 0, lastOrbits: 0, fpsFrames: 0, fpsAccum: 0, lastFpsUpdate: 0, lastQualityCheck: 0 });

  useFrame((_state, delta) => {
    const now = performance.now();
    const dt = Math.min(Math.max(delta, 0), 0.1);
    clock.timeElapsed += dt;
    if (clock.playing) clock.jd += (dt * clock.speed * clock.direction) / 86400;

    updateEphemeris(clock.jd);
    applyScales();
    applyPositions();
    updateSpins(clock.jd, camera);
    updateMoonEvents();
    updateUniforms(clock.jd);
    updateVelocities(camera);
    earthWeather.tick(dt, now);
    solarWeather.tick(dt, now);
    updateCamera(dt, bgRefs.skyGroup);
    updateExposure(dt);
    updateDofFocus(camera);
    updateGodRays(camera);

    const chain = postfx.chain;
    if (chain) chain.composer.render(dt);
    else gl.render(scene, camera);
    labelView.renderer?.render(scene, camera);

    /* FPS et dégradation automatique (seuils identiques). */
    acc.current.fpsFrames++;
    acc.current.fpsAccum += dt;
    if (acc.current.fpsAccum >= 0.6) {
      clock.fps = acc.current.fpsFrames / acc.current.fpsAccum;
      acc.current.fpsFrames = 0;
      acc.current.fpsAccum = 0;
      const s = useStore.getState();
      if (s.quality === 'auto' && !document.hidden && now > acc.current.lastQualityCheck + 2600) {
        acc.current.lastQualityCheck = now;
        if (clock.fps < 40 && s.tier !== 'low') {
          const next = nextTierDown(s.tier);
          s.setTier(next);
          s.pushToast('Qualité automatique', `FPS < 40 : passage au palier ${QUALITY_TIERS[next].label}.`, 'warn', 3500);
        }
      }
    }

    /* Interface : horloge 140 ms, fiches et étiquettes 360 ms. */
    if (now - acc.current.lastUI > 140) {
      acc.current.lastUI = now;
      const year = jdToDateParts(clock.jd).year;
      clock.outOfRange = year < 1800 || year > 2050;
      useStore.getState().syncClock({
        jd: clock.jd,
        fps: clock.fps,
        playing: clock.playing,
        direction: clock.direction,
        speed: clock.speed,
        outOfRange: clock.outOfRange,
      });
      if (clock.outOfRange && !clock.outOfRangeWarned) {
        clock.outOfRangeWarned = true;
        useStore.getState().pushToast('Hors plage', 'Les éléments JPL sont ajustés pour 1800–2050 ; la position est extrapolée.', 'warn', 11000);
      }
      if (!clock.outOfRange) clock.outOfRangeWarned = false;
      updateLightingDebug(clock.jd, camera);
    }
    if (now - acc.current.lastInfo > 360) {
      acc.current.lastInfo = now;
      const s = useStore.getState();
      s.setMoon({ ...moonInfo });
      updateLabelVisibility(camera, s.mode);
      updateLabelSelection(s.selected);
      updateOrbitVisibility(camera);
    }
    if (now - acc.current.lastOrbits > 240) {
      acc.current.lastOrbits = now;
      refreshOrbits(clock.jd);
    }
  }, 1);

  return null;
}
