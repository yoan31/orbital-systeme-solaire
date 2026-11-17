import * as THREE from 'three';
import { TEXTURE_DEFS } from './defs';
import type { TextureDef } from './defs';
import { hashSeed, proceduralTexture } from './procedural';
import type { TextureStatusEntry } from '../state/store';

const BASE = import.meta.env.BASE_URL;

const textureLoader = new THREE.TextureLoader();
textureLoader.setCrossOrigin('anonymous');

export interface LoadedTextures {
  map: Record<string, THREE.Texture>;
  status: Record<string, TextureStatusEntry>;
}

function loadTextureWithTimeout(url: string, timeoutMs: number): Promise<THREE.Texture> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error('délai dépassé'));
    }, timeoutMs);
    textureLoader.load(
      url,
      (tex) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(tex);
      },
      undefined,
      (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(err instanceof Error ? err : new Error('échec réseau'));
      },
    );
  });
}

export function configureTexture(tex: THREE.Texture, def: Pick<TextureDef, 'srgb' | 'clamp'>, anisotropy: number): THREE.Texture {
  tex.colorSpace = def.srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.anisotropy = anisotropy;
  tex.wrapS = def.clamp ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}

/* Cascade locale -> miroirs jsDelivr -> procédural, comme le moteur d'origine :
   aucune texture manquante ne bloque le démarrage. */
export async function loadAllTextures(
  anisotropy: number,
  onProgress: (text: string, pct: number) => void,
  onToast: (title: string, message: string, type: 'warn') => void,
): Promise<LoadedTextures> {
  const entries = Object.entries(TEXTURE_DEFS);
  const total = entries.length;
  let done = 0;
  const map: Record<string, THREE.Texture> = {};
  const status: Record<string, TextureStatusEntry> = {};
  onProgress(`Chargement des textures (0/${total})…`, 5);

  await Promise.all(
    entries.map(async ([key, rawDef]) => {
      const def: TextureDef = rawDef;
      const candidates: { url: string; kind: 'local' | 'remote' }[] = [];
      if (def.local) candidates.push({ url: BASE + def.local, kind: 'local' });
      for (const u of def.remote) candidates.push({ url: u, kind: 'remote' });
      let tex: THREE.Texture | null = null;
      let source: TextureStatusEntry['source'] = 'procedural';
      let usedUrl = '';
      const errors: string[] = [];
      for (const cand of candidates) {
        try {
          tex = await loadTextureWithTimeout(cand.url, 12000);
          source = cand.kind;
          usedUrl = cand.url;
          break;
        } catch (e) {
          errors.push(`${cand.url} — ${e instanceof Error ? e.message : 'échec'}`);
          console.warn(`[textures] échec ${key} : ${cand.url}`, e);
        }
      }
      if (!tex) {
        tex = proceduralTexture(def.kind, hashSeed(key));
        source = 'procedural';
        console.warn(`[textures] ${key} : repli procédural.`);
        if (!def.expected) onToast('Texture manquante', `${def.label} — repli procédural.`, 'warn');
      }
      configureTexture(tex, def, anisotropy);
      tex.name = key;
      status[key] = { source, url: usedUrl, errors, label: def.label, expected: !!def.expected };
      map[key] = tex;
      done++;
      onProgress(`Textures ${done}/${total} — ${def.label}`, 5 + 82 * (done / total));
    }),
  );
  return { map, status };
}

/* Anisotropie maximale du GPU, mémorisée hors React (utilisée par les
   textures procédurales créées dans les composants de scène). */
export const gpu = { maxAnisotropy: 4 };
