import * as THREE from 'three';
import type { Uniform } from 'three';
import { Uniform as UniformValue } from 'three';
import { BlendFunction, Effect, EffectAttribute } from 'postprocessing';
import DOF_FRAG from '../shaders/dof_frag.glsl?raw';
import EXPOSURE_FRAG from '../shaders/exposure_frag.glsl?raw';

/* Exposition adaptative : le moteur d'origine pilotait toneMappingExposure ;
   ici la même valeur multiplie la couleur HDR avant le tone mapping ACES. */
export class ExposureEffect extends Effect {
  constructor(value = 1.15) {
    super('ExposureEffect', EXPOSURE_FRAG, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, Uniform>([['uExposure', new UniformValue(value)]]),
    });
  }

  get exposure(): number {
    return (this.uniforms.get('uExposure')?.value as number) ?? 1;
  }

  set exposure(value: number) {
    const u = this.uniforms.get('uExposure');
    if (u) u.value = value;
  }
}

/* Depth of field compatible log-depth : postprocessing ne fournit aucun effet
   exploitable (CircleOfConfusionMaterial suppose une profondeur linéaire), donc
   le rayon de confusion est reconstruit depuis l'encodage logarithmique. */
export class LogDepthBokehEffect extends Effect {
  private depthUniform = new UniformValue<THREE.Texture | null>(null);

  constructor(camera: THREE.PerspectiveCamera, maxCoC = 2.4) {
    super('LogDepthBokehEffect', DOF_FRAG, {
      blendFunction: BlendFunction.NORMAL,
      attributes: EffectAttribute.DEPTH,
      uniforms: new Map<string, Uniform>([
        ['depthBuffer', new UniformValue<THREE.Texture | null>(null)],
        ['uHalfLogFC', new UniformValue(1 / Math.log2(camera.far + 1))],
        ['uFocus', new UniformValue(1)],
        ['uRange', new UniformValue(1)],
        ['uMaxCoC', new UniformValue(maxCoC)],
        ['uTexel', new UniformValue(new THREE.Vector2(1 / 1920, 1 / 1080))],
      ]),
    });
    this.depthUniform = this.uniforms.get('depthBuffer') as unknown as Uniform<THREE.Texture | null>;
  }

  override setDepthTexture(depthTexture: THREE.Texture | null): void {
    this.depthUniform.value = depthTexture;
  }

  override setSize(width: number, height: number): void {
    const texel = this.uniforms.get('uTexel')?.value as THREE.Vector2 | undefined;
    if (texel) texel.set(1 / Math.max(1, width), 1 / Math.max(1, height));
  }

  set focus(distance: number) {
    const u = this.uniforms.get('uFocus');
    if (u) u.value = distance;
  }

  set range(value: number) {
    const u = this.uniforms.get('uRange');
    if (u) u.value = value;
  }

  set camera(camera: THREE.PerspectiveCamera) {
    const u = this.uniforms.get('uHalfLogFC');
    if (u) u.value = 1 / Math.log2(camera.far + 1);
  }
}
