import { createContext, useContext } from 'react';
import type * as THREE from 'three';

export type TexMap = Record<string, THREE.Texture>;

export const TextureContext = createContext<TexMap | null>(null);

export function useTextures(): TexMap {
  const tex = useContext(TextureContext);
  if (!tex) throw new Error('Textures non chargées : TextureContext absent');
  return tex;
}
