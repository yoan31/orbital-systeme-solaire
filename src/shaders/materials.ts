import * as THREE from 'three';
import { AU_UNITS_REAL, PED } from '../astro/constants';

import SUN_VERT from './sun_vert.glsl?raw';
import SUN_FRAG from './sun_frag.glsl?raw';
import EARTH_VERT from './earth_vert.glsl?raw';
import EARTH_FRAG from './earth_frag.glsl?raw';
import CLOUD_VERT from './cloud_vert.glsl?raw';
import CLOUD_FRAG from './cloud_frag.glsl?raw';
import ATMO_VERT from './atmo_vert.glsl?raw';
import ATMO_FRAG from './atmo_frag.glsl?raw';
import MOON_VERT from './moon_vert.glsl?raw';
import MOON_FRAG from './moon_frag.glsl?raw';
import SATURN_VERT from './saturn_vert.glsl?raw';
import SATURN_FRAG from './saturn_frag.glsl?raw';
import RING_VERT from './ring_vert.glsl?raw';
import RING_FRAG from './ring_frag.glsl?raw';
import BELT_VERT from './belt_vert.glsl?raw';
import BELT_FRAG from './belt_frag.glsl?raw';
import WEATHER_FRAG from './weather_frag.glsl?raw';
import AURORA_VERT from './aurora_vert.glsl?raw';
import AURORA_FRAG from './aurora_frag.glsl?raw';
import MAG_VERT from './mag_vert.glsl?raw';
import MAG_FRAG from './mag_frag.glsl?raw';

export type TexMap = Record<string, THREE.Texture>;

export function createSunMaterial(tex: TexMap): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: tex.sun },
      uTime: { value: 0 },
      uSunSpin: { value: 0 },
      uActivity: { value: 0 },
      uSunspots: { value: 0 },
      uFlare: { value: 0 },
      uFlareUv: { value: new THREE.Vector2(0.6, 0.5) },
      uWaveTint: { value: new THREE.Color(1, 1, 1) },
    },
    vertexShader: SUN_VERT,
    fragmentShader: SUN_FRAG,
  });
}

export function createEarthMaterial(tex: TexMap): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uDay: { value: tex.earthDay },
      uNight: { value: tex.earthNight },
      uNormalMap: { value: tex.earthNormal },
      uSpecular: { value: tex.earthSpecular },
      uSunPos: { value: new THREE.Vector3(0, 0, 0) },
      uIllum: { value: 1 },
    },
    vertexShader: EARTH_VERT,
    fragmentShader: EARTH_FRAG,
  });
}

export function createSaturnMaterial(tex: TexMap): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: tex.saturn },
      uRingMap: { value: tex.saturnRing },
      uSunPos: { value: new THREE.Vector3(0, 0, 0) },
      uPlanetPos: { value: new THREE.Vector3() },
      uRingNormal: { value: new THREE.Vector3(0, 1, 0) },
      uRingInner: { value: 1 },
      uRingOuter: { value: 2 },
      uIllum: { value: 1 },
    },
    vertexShader: SATURN_VERT,
    fragmentShader: SATURN_FRAG,
  });
}

export function createStandardMaterial(key: string, tex: TexMap): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    map: key === 'venus' ? tex.venusSurface : tex[key],
    roughness: key === 'uranus' || key === 'neptune' ? 0.82 : 0.96,
    metalness: 0,
    color: 0xffffff,
  });
}

export function createCloudMaterial(tex: TexMap): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: tex.earthClouds },
      uSunPos: { value: new THREE.Vector3(0, 0, 0) },
      uOpacity: { value: 0.86 },
      uIllum: { value: 1 },
    },
    vertexShader: CLOUD_VERT,
    fragmentShader: CLOUD_FRAG,
    transparent: true,
    depthWrite: false,
    side: THREE.FrontSide,
  });
}

export function createAtmoMaterial(color: number, intensity: number, atmoColor = color): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uSunPos: { value: new THREE.Vector3(0, 0, 0) },
      uColor: { value: new THREE.Color(color) },
      uAtmoColor: { value: new THREE.Color(atmoColor) },
      uIntensity: { value: intensity },
      uIllum: { value: 1 },
    },
    vertexShader: ATMO_VERT,
    fragmentShader: ATMO_FRAG,
    transparent: true,
    depthWrite: false,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
  });
}

export function createMoonMaterial(tex: TexMap): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: tex.moon },
      uSunPos: { value: new THREE.Vector3(0, 0, 0) },
      uEarthPos: { value: new THREE.Vector3() },
      uEarthshine: { value: 0.55 },
      uEclipse: { value: 0 },
      uIllum: { value: 1 },
    },
    vertexShader: MOON_VERT,
    fragmentShader: MOON_FRAG,
  });
}

export function createRingMaterial(tex: TexMap): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: tex.saturnRing },
      uSunPos: { value: new THREE.Vector3(0, 0, 0) },
      uPlanetPos: { value: new THREE.Vector3() },
      uRingNormal: { value: new THREE.Vector3(0, 1, 0) },
      uPlanetRadius: { value: 1 },
      uOpacity: { value: 0.96 },
      uInner: { value: 1 },
      uOuter: { value: 2 },
      uIllum: { value: 1 },
    },
    vertexShader: RING_VERT,
    fragmentShader: RING_FRAG,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

/* Uniforms partagés par la ceinture principale et la ceinture de Kuiper. */
export const beltUniforms = {
  uT: { value: 0 },
  uMode: { value: 1 },
  uRealScale: { value: AU_UNITS_REAL },
  uPedScale: { value: PED.distScale },
  uPedPower: { value: PED.distPower },
  uPixelRatio: { value: 1 },
  uSizeMul: { value: 1 },
};

export function createBeltMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: beltUniforms,
    vertexShader: BELT_VERT,
    fragmentShader: BELT_FRAG,
    transparent: false,
    depthTest: false,
    depthWrite: false,
    blending: THREE.NormalBlending,
  });
}

export function createWeatherOverlayMaterial(map: THREE.Texture, detail: THREE.Texture): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: map },
      uDetail: { value: detail },
      uSunPos: { value: new THREE.Vector3(0, 0, 0) },
      uOpacity: { value: 0.92 },
      uCloudOnly: { value: 0 },
    },
    vertexShader: CLOUD_VERT,
    fragmentShader: WEATHER_FRAG,
    transparent: true,
    depthWrite: false,
    side: THREE.FrontSide,
  });
}

export function createAuroraMaterial(aurora: THREE.Texture): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uAurora: { value: aurora },
      uSunPos: { value: new THREE.Vector3(0, 0, 0) },
      uKp: { value: 0 },
      uUseOvation: { value: 0 },
      uTime: { value: 0 },
      uIntensity: { value: 0 },
    },
    vertexShader: AURORA_VERT,
    fragmentShader: AURORA_FRAG,
    transparent: true,
    depthWrite: false,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
  });
}

export function createMagMaterial(color: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uSunPos: { value: new THREE.Vector3(0, 0, 0) },
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: 0 },
    },
    vertexShader: MAG_VERT,
    fragmentShader: MAG_FRAG,
    transparent: true,
    depthWrite: false,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
  });
}
