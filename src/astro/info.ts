import { COMETS, COMET_KEYS, SATELLITES, type PlanetKey } from './constants';

export interface BodyInfo {
  name: string;
  type: string;
  short: string;
  color: string;
  radiusKm: number;
  tilt: number;
  rotationHours: number;
  moons: number;
  temp: string;
  desc: string;
  cometKey?: string;
  parent?: string;
}

export const BODY_LIST: string[] = ['sun', 'mercury', 'venus', 'earth', 'moon', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'].concat(COMET_KEYS);
export const PLANET_KEYS: PlanetKey[] = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];

export const BODY_INFO: Record<string, BodyInfo> = {
  sun: { name: 'Soleil', type: 'Étoile · type G2V', short: 'Étoile', color: '#ffb347', radiusKm: 696340, tilt: 7.25, rotationHours: 609.12, moons: 0, temp: '5 772 K',
    desc: "Étoile centrale : 99,86 % de la masse du système solaire. Sa lumière met 8 min 20 s pour atteindre la Terre. La couronne et la granulation sont animées par shader émissif." },
  mercury: { name: 'Mercure', type: 'Planète tellurique', short: 'Tellurique', color: '#b8b0a4', radiusKm: 2439.7, tilt: 0.034, rotationHours: 1407.6, moons: 0, temp: '−173 à 427 °C',
    desc: "La plus interne et la plus petite planète. Surface criblée de cratères, quasi sans atmosphère, contraste thermique extrême entre jour et nuit." },
  venus: { name: 'Vénus', type: 'Planète tellurique', short: 'Tellurique', color: '#e6c58e', radiusKm: 6051.8, tilt: 177.36, rotationHours: -5832.5, moons: 0, temp: '464 °C (moy.)',
    desc: "Atmosphère de CO₂ et effet de serre incontrôlé. Rotation rétrograde très lente : un jour vénusien dure 243 jours terrestres. Les nuages sont rendus sur une seconde sphère." },
  earth: { name: 'Terre', type: 'Planète tellurique', short: 'Tellurique', color: '#5da9e9', radiusKm: 6371.0, tilt: 23.4393, rotationHours: 23.9344696, moons: 1, temp: '15 °C (moy.)',
    desc: "Carte de jour, lumières nocturnes, nuages animés, relief, spéculaire des océans et atmosphère Fresnel. L'axe et la position orbitale donnent le terminateur et les saisons réels." },
  moon: { name: 'Lune', type: 'Satellite naturel de la Terre', short: 'Satellite', color: '#bfbfbf', radiusKm: 1737.4, tilt: 6.68, rotationHours: 655.72, moons: 0, temp: '−173 à 127 °C',
    desc: "Position géocentrique issue du modèle analytique de Meeus (nœud rétrograde, inclinaison 5,145°). Les phases, l'éclairage et les éclipses découlent de l'alignement réel Soleil–Terre–Lune." },
  mars: { name: 'Mars', type: 'Planète tellurique', short: 'Tellurique', color: '#c1440e', radiusKm: 3389.5, tilt: 25.19, rotationHours: 24.622962, moons: 2, temp: '−63 °C (moy.)',
    desc: "Désert d'oxyde de fer, calottes polaires et saisons. Deux lunes minuscules (Phobos, Déimos) non représentées à l'échelle." },
  jupiter: { name: 'Jupiter', type: 'Géante gazeuse', short: 'Gazeuse', color: '#d8b48c', radiusKm: 69911, tilt: 3.13, rotationHours: 9.925, moons: 95, temp: '−110 °C (1 bar)',
    desc: "La plus massive : 318 masses terrestres. Bandes nuageuses et Grande Tache Rouge. Quatre lunes galiléennes majeures sur orbites réelles (périodes et demi-grands axes)." },
  saturn: { name: 'Saturne', type: 'Géante gazeuse', short: 'Gazeuse', color: '#e0c48f', radiusKm: 58232, tilt: 26.73, rotationHours: 10.656, moons: 274, temp: '−140 °C (1 bar)',
    desc: "Anneaux de glace avec texture radiale, transparence alpha et ombres analytiques planète→anneaux et anneaux→planète. Titan, Rhéa et Japet orbitent dans le plan équatorial." },
  uranus: { name: 'Uranus', type: 'Géante de glace', short: 'Glace', color: '#9fe3e8', radiusKm: 25362, tilt: 97.77, rotationHours: -17.24, moons: 28, temp: '−195 °C (1 bar)',
    desc: "Axe quasi couché sur son orbite (97,77°) et rotation rétrograde. Anneaux fins procéduraux. Les satellites ne sont pas représentés à l'échelle." },
  neptune: { name: 'Neptune', type: 'Géante de glace', short: 'Glace', color: '#4b6fd8', radiusKm: 24622, tilt: 28.32, rotationHours: 16.11, moons: 16, temp: '−200 °C (1 bar)',
    desc: "Vents les plus rapides du système solaire. Triton, sa grande lune, orbite en sens rétrograde (période négative)." },
  pluto: { name: 'Pluton', type: 'Planète naine', short: 'Naine', color: '#c9b8a6', radiusKm: 1188.3, tilt: 122.53, rotationHours: -153.2928, moons: 5, temp: '−229 °C',
    desc: "Bonus : planète naine à l'orbite très inclinée (17,1°) et excentrique, en résonance 2:3 avec Neptune. Texture procédurale faute de texture officielle redistribuée." }
};
for (const c of COMETS) {
  BODY_INFO[c.key] = {
    name: c.name, type: c.type, short: c.short, color: c.color, radiusKm: c.radiusKm,
    tilt: 0, rotationHours: c.rotationHours, moons: 0, temp: c.temp, cometKey: c.key, desc: c.desc
  };
}
for (const sat of SATELLITES) {
  const parent = BODY_INFO[sat.parent];
  BODY_INFO[sat.key] = {
    name: sat.name, type: 'Satellite de ' + parent.name, short: 'Satellite', color: '#' + sat.color.toString(16).padStart(6, '0'),
    radiusKm: sat.radiusKm, tilt: 0, rotationHours: 0, moons: 0, temp: '—', parent: sat.parent,
    desc: "Orbite simplifiée circulaire dans le plan équatorial du parent. Demi-grand axe, période et inclinaison réels ; phase initiale approchée."
  };
}
