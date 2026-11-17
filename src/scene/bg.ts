import * as THREE from 'three';

/* Scène d'arrière-plan rendue en premier (ciel, orbites, grille, ceintures),
   puis la scène principale avec un effacement de profondeur : les planètes
   passent toujours devant les orbites et les ceintures. */
export const bgScene = new THREE.Scene();

export const bgRefs = {
  skyGroup: null as THREE.Group | null,
  starsMaterial: null as THREE.ShaderMaterial | null,
  orbitGroup: null as THREE.Group | null,
  gridGroup: null as THREE.Group | null,
};
