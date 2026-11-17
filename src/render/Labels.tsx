import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

/* Le renderer CSS2D reste celui de three : la logique de priorité et
   d'occlusion des étiquettes est portée telle quelle par la boucle. */
export const labelView = {
  renderer: null as CSS2DRenderer | null,
};

export function Labels() {
  const size = useThree((s) => s.size);

  useEffect(() => {
    const host = document.getElementById('labels');
    if (!host) return;
    const renderer = new CSS2DRenderer({ element: host });
    renderer.setSize(window.innerWidth, window.innerHeight);
    labelView.renderer = renderer;
    return () => {
      labelView.renderer = null;
      host.replaceChildren();
    };
  }, []);

  useEffect(() => {
    labelView.renderer?.setSize(size.width, size.height);
  }, [size.width, size.height]);

  return null;
}
