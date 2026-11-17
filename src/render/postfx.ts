import * as THREE from 'three';
import {
  BloomEffect,
  EffectComposer,
  EffectPass,
  GodRaysEffect,
  RenderPass,
  SMAAEffect,
  ToneMappingEffect,
  ToneMappingMode,
  VignetteEffect,
} from 'postprocessing';
import { QUALITY_TIERS } from '../astro/quality';
import type { TierName } from '../astro/quality';
import { bgScene } from '../scene/bg';
import { ExposureEffect, LogDepthBokehEffect } from './effects';

export interface PostChain {
  composer: EffectComposer;
  bloom: BloomEffect | null;
  exposure: ExposureEffect;
  godRays: GodRaysEffect | null;
  dof: LogDepthBokehEffect | null;
}

/* Chaîne de post-traitement propriétaire : construite par PostFX.tsx, rendue
   par la boucle. Deux RenderPass (fond puis scène principale) reproduisent le
   clear couleur/profondeur du moteur d'origine. */
export const postfx = {
  chain: null as PostChain | null,
  sunDisc: null as THREE.Mesh | null,
  exposure: 1.15,
  bloomBoost: 1,
  bloomBase: 0,
};

type SunDiscListener = (disc: THREE.Mesh | null) => void;
const sunDiscListeners = new Set<SunDiscListener>();

export function setSunDisc(disc: THREE.Mesh | null): void {
  postfx.sunDisc = disc;
  for (const fn of sunDiscListeners) fn(disc);
}

export function onSunDisc(fn: SunDiscListener): () => void {
  sunDiscListeners.add(fn);
  return () => {
    sunDiscListeners.delete(fn);
  };
}

export function disposeChain(chain: PostChain | null): void {
  if (!chain) return;
  chain.composer.dispose();
  chain.bloom?.dispose();
  chain.godRays?.dispose();
  chain.dof?.dispose();
  chain.exposure.dispose();
}

export function buildChain(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  tier: TierName,
  sunDisc: THREE.Mesh | null,
): PostChain {
  const config = QUALITY_TIERS[tier];
  const composer = new EffectComposer(renderer, { frameBufferType: THREE.HalfFloatType });
  composer.setSize(window.innerWidth, window.innerHeight);

  composer.addPass(new RenderPass(bgScene, camera));
  const mainPass = new RenderPass(scene, camera);
  // Couleur conservée, profondeur effacée : équivalent exact du clear:false /
  // clearDepth:true du RenderPass d'origine.
  mainPass.clearPass.setClearFlags(false, true, false);
  composer.addPass(mainPass);

  let godRays: GodRaysEffect | null = null;
  if (config.godrays && sunDisc) {
    godRays = new GodRaysEffect(camera, sunDisc, {
      samples: 48,
      density: 0.9,
      decay: 0.92,
      weight: 0.35,
      exposure: 0.45,
      clampMax: 1,
      resolutionScale: 0.5,
      blur: true,
    });
    composer.addPass(new EffectPass(camera, godRays));
  }

  let dof: LogDepthBokehEffect | null = null;
  if (config.dof) {
    dof = new LogDepthBokehEffect(camera, 4.5);
    composer.addPass(new EffectPass(camera, dof));
  }

  let bloom: BloomEffect | null = null;
  if (config.bloom > 0.02) {
    bloom = new BloomEffect({
      luminanceThreshold: 0.9,
      luminanceSmoothing: 0.55,
      intensity: config.bloom,
      mipmapBlur: true,
    });
    postfx.bloomBase = config.bloom;
  } else {
    postfx.bloomBase = 0;
  }

  const exposure = new ExposureEffect(postfx.exposure);
  const smaa = config.smaa ? new SMAAEffect() : null;
  const vignette = config.vignette ? new VignetteEffect({ eskil: false, offset: 0.3, darkness: 0.55 }) : null;
  const toneMapping = new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC });

  const finalEffects = [];
  if (bloom) finalEffects.push(bloom);
  finalEffects.push(exposure);
  if (smaa) finalEffects.push(smaa);
  if (vignette) finalEffects.push(vignette);
  finalEffects.push(toneMapping);
  composer.addPass(new EffectPass(camera, ...finalEffects));

  return { composer, bloom, exposure, godRays, dof };
}
