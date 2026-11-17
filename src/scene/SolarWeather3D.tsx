import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { bodies } from '../render/registry';
import { clock } from '../state/clock';
import { useStore } from '../state/store';
import { solarWeather } from '../services/solarWeather';
import { createAuroraMaterial, createMagMaterial } from '../shaders/materials';
import { geoHigh } from './geometry';

/* =====================================================================
   Effets 3D de la météo solaire : aurores (Ovation), magnétosphère
   comprimée, protubérance liée à l'éruption. Mêmes tailles, couleurs et
   formules que legacy-index.html:4930-5010 et 5400-5450. Les objets
   s'attachent impérativement aux corps du registre (Terre / Soleil) car
   ils héritent de leur échelle et de leur rotation. Aucune priorité de
   useFrame : la boucle de rendu reste celle d'EphemerisDriver.
   ===================================================================== */

const X_AXIS = new THREE.Vector3(1, 0, 0);
const sunward = new THREE.Vector3();

function makeProminenceTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('contexte canvas 2D indisponible');
  ctx.globalCompositeOperation = 'lighter';
  ctx.shadowColor = 'rgba(255,130,30,0.9)';
  ctx.shadowBlur = 18;
  ctx.lineCap = 'round';
  const loops = [
    { color: 'rgba(255,190,90,0.95)', width: 5, dy: 0 },
    { color: 'rgba(255,105,35,0.8)', width: 8, dy: 5 },
    { color: 'rgba(255,230,170,0.7)', width: 2, dy: -4 },
  ];
  for (const l of loops) {
    ctx.strokeStyle = l.color;
    ctx.lineWidth = l.width;
    ctx.beginPath();
    ctx.moveTo(38, 205 + l.dy);
    ctx.bezierCurveTo(65, 50 + l.dy, 190, 50 + l.dy, 218, 205 + l.dy);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeTransparentTexture(): THREE.DataTexture {
  const data = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0]);
  const tex = new THREE.DataTexture(data, 2, 2, THREE.RGBAFormat);
  tex.needsUpdate = true;
  tex.colorSpace = THREE.NoColorSpace;
  return tex;
}

export function SolarWeather3D() {
  const assets = useMemo(() => {
    const blank = makeTransparentTexture();

    const auroraMat = createAuroraMaterial(blank);
    /* La fabrique utilise BackSide ; l'original affichait la face avant de la
       coquille (sinon elle est masquée par la sphère opaque de la Terre). */
    auroraMat.side = THREE.FrontSide;
    const aurora = new THREE.Mesh(geoHigh, auroraMat);
    aurora.scale.setScalar(1.012);
    aurora.visible = false;

    const magMat = createMagMaterial(0x4f9fff);
    magMat.side = THREE.DoubleSide;
    const magGroup = new THREE.Group();
    const magMesh = new THREE.Mesh(geoHigh, magMat);
    magGroup.add(magMesh);
    magGroup.visible = false;

    const flareTex = makeProminenceTexture();
    const flareMat = new THREE.SpriteMaterial({
      map: flareTex,
      color: 0xffb366,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true,
      opacity: 0,
    });
    const flare = new THREE.Sprite(flareMat);
    flare.visible = false;

    return { blank, auroraMat, aurora, magMat, magGroup, flareTex, flareMat, flare };
  }, []);

  useEffect(
    () => () => {
      assets.aurora.removeFromParent();
      assets.magGroup.removeFromParent();
      assets.flare.removeFromParent();
      assets.auroraMat.dispose();
      assets.magMat.dispose();
      assets.flareMat.dispose();
      assets.flareTex.dispose();
      /* La texture Ovation appartient au service : il libère lui-même
         l'ancienne quand une nouvelle grille arrive. */
      assets.blank.dispose();
      const current = assets.auroraMat.uniforms.uAurora.value as THREE.Texture | null;
      if (current && current !== assets.blank && current !== solarWeather.auroraTexture) {
        current.dispose();
      }
    },
    [assets],
  );

  useFrame(() => {
    const earth = bodies.get('earth');
    const sun = bodies.get('sun');
    const st = useStore.getState();
    const on = solarWeather.enabled && st.layers.solarWeather;

    /* Attachement paresseux : robuste si un corps est monté après nous. */
    if (earth) {
      if (assets.aurora.parent !== earth.mesh) earth.mesh.add(assets.aurora);
      if (!assets.magGroup.parent) earth.group.add(assets.magGroup);
    }
    if (sun && !assets.flare.parent) sun.group.add(assets.flare);

    /* Uniforms du Soleil : activité, taches, éruption, UV et teinte. */
    if (sun?.uniforms) {
      const u = sun.uniforms;
      const activity = on ? solarWeather.activity : 0;
      const spots = on ? solarWeather.sunspots : 0;
      const flare = on ? solarWeather.flare : 0;
      if (u.uActivity) u.uActivity.value = activity;
      if (u.uSunspots) u.uSunspots.value = spots;
      if (u.uFlare) u.uFlare.value = flare;
      if (u.uFlareUv) {
        (u.uFlareUv.value as THREE.Vector2).set(solarWeather.flareUv.x, solarWeather.flareUv.y);
      }
      if (u.uWaveTint) {
        (u.uWaveTint.value as THREE.Color).setRGB(
          solarWeather.waveTint[0],
          solarWeather.waveTint[1],
          solarWeather.waveTint[2],
        );
      }
    }

    /* Aurores : la grille Ovation remplace l'anneau procédural dès réception. */
    if (solarWeather.auroraTexture && assets.auroraMat.uniforms.uAurora.value !== solarWeather.auroraTexture) {
      assets.auroraMat.uniforms.uAurora.value = solarWeather.auroraTexture;
      assets.auroraMat.uniforms.uUseOvation.value = 1;
    }
    const auroraIntensity = on ? solarWeather.auroraIntensity : 0;
    assets.aurora.visible = auroraIntensity > 0;
    if (assets.aurora.visible) {
      const u = assets.auroraMat.uniforms;
      u.uKp.value = solarWeather.kp;
      u.uTime.value = clock.timeElapsed;
      (u.uSunPos.value as THREE.Vector3).set(0, 0, 0);
      u.uIntensity.value = auroraIntensity;
    }

    /* Magnétosphère : ellipsoïde orienté vers le Soleil, comprimé en G3+. */
    const magOpacity = on ? solarWeather.magOpacity : 0;
    assets.magGroup.visible = magOpacity > 0;
    if (assets.magGroup.visible && earth) {
      sunward.copy(earth.worldPos).multiplyScalar(-1);
      if (sunward.lengthSq() < 1e-12) sunward.set(1, 0, 0);
      else sunward.normalize();
      assets.magGroup.quaternion.setFromUnitVectors(X_AXIS, sunward);
      const R = earth.radiusWorld;
      let g = NaN;
      const chips = st.solarData.scales;
      for (let i = 0; i < chips.length; i++) {
        if (chips[i].label === 'G') g = parseInt(chips[i].value, 10);
      }
      const compress = g >= 3 || solarWeather.kp >= 7 ? 0.64 : 1;
      assets.magGroup.scale.set(R * 2.7 * compress, R * 2.1, R * 2.1);
      assets.magMat.uniforms.uOpacity.value = magOpacity;
    }

    /* Protubérance : position cohérente avec uFlareUv du shader solaire. */
    if (sun) {
      const fv = solarWeather.flareUv;
      const lat = (fv.y - 0.5) * Math.PI;
      const lon = (fv.x - 0.5) * Math.PI * 2;
      const R = sun.radiusWorld;
      assets.flare.position.set(
        Math.cos(lat) * Math.cos(lon) * R * 1.025,
        Math.sin(lat) * R * 1.025,
        Math.cos(lat) * Math.sin(lon) * R * 1.025,
      );
      assets.flare.scale.setScalar(Math.max(R * 1.05, 0.01));
      assets.flareMat.opacity = on ? solarWeather.flare * 0.8 : 0;
      assets.flare.visible = on && solarWeather.flare > 0.02;
    }
  });

  return null;
}
