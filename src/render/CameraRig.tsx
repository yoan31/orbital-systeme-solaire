import { useEffect } from 'react';
import type * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useStore } from '../state/store';
import { view } from './camera';

/* Contrôles et caméra : mêmes réglages que le moteur d'origine. Les tweens
   passent uniquement par les refs (jamais par la prop camera du Canvas). */
export function CameraRig() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null;
  const mode = useStore((s) => s.mode);

  useEffect(() => {
    if (window.innerWidth < window.innerHeight * 0.9) camera.position.set(0, 470, 230);
    else camera.position.set(0, 220, 420);
  }, [camera]);

  useEffect(() => {
    view.camera = camera;
    view.controls = controls ?? null;
  }, [camera, controls]);

  return (
    <OrbitControls
      makeDefault
      enableDamping
      dampingFactor={0.07}
      rotateSpeed={0.55}
      zoomSpeed={0.85}
      panSpeed={0.7}
      screenSpacePanning
      minDistance={mode === 'real' ? 0.0004 : 0.05}
      maxDistance={mode === 'real' ? 150000 : 2400}
    />
  );
}
