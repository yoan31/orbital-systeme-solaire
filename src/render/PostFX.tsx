import { useEffect, useState } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { QUALITY_TIERS } from '../astro/quality';
import { useStore } from '../state/store';
import { beltUniforms } from '../shaders/materials';
import { buildChain, disposeChain, onSunDisc, postfx } from './postfx';

/* Chaîne de post-traitement : reconstruite quand le palier change ou quand le
   disque solaire (source des god rays) apparaît. */
export function PostFX() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const tier = useStore((s) => s.tier);
  const [disc, setDisc] = useState<THREE.Mesh | null>(postfx.sunDisc);
  const [chainVersion, setChainVersion] = useState(0);

  useEffect(() => onSunDisc(setDisc), []);

  useEffect(() => {
    const chain = buildChain(gl, scene, camera, tier, disc);
    postfx.chain = chain;
    setChainVersion((v) => v + 1);
    return () => {
      if (postfx.chain === chain) postfx.chain = null;
      disposeChain(chain);
    };
  }, [gl, scene, camera, tier, disc]);

  /* Pixel ratio et taille suivent le palier (comme applyQuality à l'origine). */
  useEffect(() => {
    const chain = postfx.chain;
    const pr = Math.min(window.devicePixelRatio || 1, QUALITY_TIERS[tier].pixelRatio);
    gl.setPixelRatio(pr);
    beltUniforms.uPixelRatio.value = pr;
    beltUniforms.uSizeMul.value = tier === 'low' ? 1.25 : 1;
    useStore.setState({ dpr: pr });
    if (chain) {
      chain.composer.setSize(size.width, size.height);
    }
  }, [chainVersion, tier, gl, size.width, size.height]);

  return null;
}
