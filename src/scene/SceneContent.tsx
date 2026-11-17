import { createPortal } from '@react-three/fiber';
import { SUN_LIGHT_REAL } from '../astro/constants';
import { useStore } from '../state/store';
import { bgScene } from '../scene/bg';
import { Belts } from '../scene/Belts';
import { Comets } from '../scene/Comets';
import { DebugLighting } from '../scene/DebugLighting';
import { Earth } from '../scene/Earth';
import { Grid } from '../scene/Grid';
import { Orbits } from '../scene/Orbits';
import { Planets } from '../scene/Planet';
import { Sky } from '../scene/Sky';
import { Sun } from '../scene/Sun';
import { VelocityArrows } from '../scene/VelocityArrows';
import { SolarWeather3D } from '../scene/SolarWeather3D';
import { CameraRig } from '../render/CameraRig';
import { EphemerisDriver } from '../render/EphemerisDriver';
import { Labels } from '../render/Labels';
import { PostFX } from '../render/PostFX';

/* Scène : le fond (ciel, orbites, grille, ceintures) vit dans bgScene via un
   portail R3F ; le reste dans la scène principale. L'ordre de montage compte :
   Sun avant PostFX (source des god rays), EphemerisDriver en dernier. */
export function SceneContent() {
  const mode = useStore((s) => s.mode);
  return (
    <>
      {createPortal(
        <>
          <Sky />
          <Orbits />
          <Grid />
          <Belts />
        </>,
        bgScene,
      )}
      <group name="lights">
        <ambientLight color={0x24334d} intensity={0.3} />
        <pointLight color={0xfff1dc} intensity={mode === 'real' ? SUN_LIGHT_REAL : 1.5} distance={0} decay={mode === 'real' ? 2 : 0} position={[0, 0, 0]} />
      </group>
      <Sun />
      <Planets />
      <Earth />
      <Comets />
      <VelocityArrows />
      <DebugLighting />
      <SolarWeather3D />
      <CameraRig />
      <PostFX />
      <EphemerisDriver />
      <Labels />
    </>
  );
}
