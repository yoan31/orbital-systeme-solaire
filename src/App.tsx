import { useEffect, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useThree } from '@react-three/fiber';
import { detectGpu } from './render/gpu';
import { SceneContent } from './scene/SceneContent';
import { useStore } from './state/store';
import { Loader } from './ui/Loader';
import { LeftPanel } from './ui/LeftPanel';
import { MobileTabs } from './ui/MobileTabs';
import { RightPanel } from './ui/RightPanel';
import { TimeDock } from './ui/TimeDock';
import { Toasts } from './ui/Toasts';
import { TopBar } from './ui/TopBar';
import { CreditsModal } from './ui/modals/CreditsModal';
import { HelpModal } from './ui/modals/HelpModal';
import { SolarModal } from './ui/modals/SolarModal';
import { useKeyboard } from './render/useKeyboard';
import { TextureContext } from './textures/context';
import type { TexMap } from './textures/context';
import { gpu, loadAllTextures } from './textures/loader';

/* Le Canvas crée le contexte WebGL ; les textures se chargent ensuite pour
   bénéficier de l'anisotropie réelle du GPU, exactement comme dans le moteur
   d'origine (chargement avant construction de la scène). */
function Stage() {
  const gl = useThree((s) => s.gl);
  const [textures, setTextures] = useState<TexMap | null>(null);
  const setTextureStatus = useStore((s) => s.setTextureStatus);
  const pushToast = useStore((s) => s.pushToast);
  const setLoaderDone = useStore((s) => s.setLoaderDone);

  useEffect(() => {
    let alive = true;
    gpu.maxAnisotropy = gl.capabilities.getMaxAnisotropy();
    setLoaderDone(false);
    loadAllTextures(
      gpu.maxAnisotropy,
      (text, pct) => {
        const el = document.getElementById('loadStatus');
        if (el) el.textContent = text;
        const bar = document.getElementById('loadBar');
        const label = document.getElementById('loadPct');
        const p = Math.max(0, Math.min(100, pct));
        if (bar) bar.style.width = `${p.toFixed(1)}%`;
        if (label) label.textContent = `${Math.round(p)} %`;
      },
      (title, message, type) => pushToast(title, message, type),
    )
      .then((loaded) => {
        if (!alive) return;
        setTextureStatus(loaded.status);
        setTextures(loaded.map);
        setLoaderDone(true);
        const keys = Object.keys(loaded.status);
        const unexpected = keys.filter((k) => loaded.status[k].source === 'procedural' && !loaded.status[k].expected);
        if (unexpected.length > 0) {
          pushToast('Textures', `${unexpected.length} texture(s) en repli procédural. Voir Crédits pour le détail.`, 'warn', 9000);
        }
      })
      .catch((e: unknown) => {
        console.error('[textures] échec global', e);
        pushToast('Textures', 'Chargement impossible, la simulation reste utilisable.', 'err', 0);
      });
    return () => {
      alive = false;
    };
  }, [gl, pushToast, setTextureStatus, setLoaderDone]);

  if (!textures) return null;
  return (
    <TextureContext.Provider value={textures}>
      <SceneContent />
    </TextureContext.Provider>
  );
}

function Viewport() {
  return (
    <div id="viewport">
      <Canvas
        gl={{
          antialias: false,
          powerPreference: 'high-performance',
          logarithmicDepthBuffer: true,
          stencil: false,
          alpha: false,
        }}
        camera={{ fov: 48, near: 0.0008, far: 300000, position: [0, 220, 420] }}
        onCreated={({ gl }) => {
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.toneMapping = THREE.NoToneMapping;
          gl.setClearColor(0x03060c, 1);
          gl.domElement.setAttribute('aria-label', 'Scène 3D du système solaire');
          gl.domElement.style.touchAction = 'none';
          detectGpu(gl);
          gl.domElement.addEventListener('webglcontextlost', (event) => {
            event.preventDefault();
            useStore.getState().pushToast('Contexte WebGL perdu', 'Le GPU a réinitialisé le contexte. Rechargez la page.', 'err', 0);
          });
        }}
      >
        <Stage />
      </Canvas>
      <div id="labels" />
    </div>
  );
}

export function App() {
  useKeyboard();
  return (
    <>
      <Viewport />
      <TopBar />
      <MobileTabs />
      <LeftPanel />
      <RightPanel />
      <TimeDock />
      <Toasts />
      <Loader />
      <CreditsModal />
      <HelpModal />
      <SolarModal />
    </>
  );
}
