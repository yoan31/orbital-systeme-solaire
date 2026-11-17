/* Paliers de qualité : valeurs du moteur d'origine + portes du pipeline
   post-traitement (SMAA toujours actif, le reste par palier). */
export type TierName = 'low' | 'medium' | 'high' | 'ultra';
export type QualityName = 'auto' | TierName;
export type Mode = 'ped' | 'real';

export interface TierConfig {
  label: string;
  pixelRatio: number;
  bloom: number;
  asteroids: number;
  highGeo: boolean;
  smaa: boolean;
  vignette: boolean;
  godrays: boolean;
  dof: boolean;
}

export const QUALITY_TIERS: Record<TierName, TierConfig> = {
  low: { label: 'Bas', pixelRatio: 1.0, bloom: 0.0, asteroids: 30000, highGeo: false, smaa: true, vignette: false, godrays: false, dof: false },
  medium: { label: 'Moyen', pixelRatio: 1.25, bloom: 0.3, asteroids: 70000, highGeo: true, smaa: true, vignette: true, godrays: false, dof: false },
  high: { label: 'Élevé', pixelRatio: 1.5, bloom: 0.5, asteroids: 140000, highGeo: true, smaa: true, vignette: true, godrays: true, dof: false },
  ultra: { label: 'Ultra', pixelRatio: 2.0, bloom: 0.68, asteroids: 220000, highGeo: true, smaa: true, vignette: true, godrays: true, dof: true },
};

export const TIER_ORDER: TierName[] = ['low', 'medium', 'high', 'ultra'];

export function nextTierDown(tier: TierName): TierName {
  if (tier === 'ultra') return 'high';
  if (tier === 'high') return 'medium';
  return 'low';
}
