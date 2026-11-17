/* =====================================================================
   CONSTANTES ASTRONOMIQUES ET CATALOGUES (port de legacy-index.html)
   ===================================================================== */

export const AU_UNITS_REAL = 400;              // 1 UA = 400 unités monde (échelle réaliste)
export const PED = { distScale: 60, distPower: 0.55, radiusScale: 1.2, radiusPower: 0.4, satelliteRadius: 0.55 };
export const SUN_LIGHT_REAL = 4.0 * AU_UNITS_REAL * AU_UNITS_REAL;
export const SUN_LIGHT_PED = 12000;

export const J2000 = 2451545.0;
export const AU_KM = 149597870.7;
export const OBLIQUITY_J2000 = 23.4392911111;
export const MU_SUN_AU3D2 = 2.959122082855911e-4;
export const MU_SUN_KM3S2 = 1.32712440018e11;
export const DAYS_PER_CENTURY = 36525;
export const DEG = Math.PI / 180;

export type PlanetKey = 'mercury' | 'venus' | 'earth' | 'mars' | 'jupiter' | 'saturn' | 'uranus' | 'neptune' | 'pluto';

export interface PlanetElements {
  a: [number, number];
  e: [number, number];
  I: [number, number];
  L: [number, number];
  peri: [number, number];
  node: [number, number];
}

export const PLANET_ELEMENTS: Record<PlanetKey, PlanetElements> = {
  mercury: { a: [0.38709927, 0.00000037], e: [0.20563593, 0.00001906], I: [7.00497902, -0.00594749], L: [252.25032350, 149472.67411175], peri: [77.45779628, 0.16047689], node: [48.33076593, -0.12534081] },
  venus:   { a: [0.72333566, 0.00000390], e: [0.00677672, -0.00004107], I: [3.39467605, -0.00078890], L: [181.97909950, 58517.81538729], peri: [131.60246718, 0.00268329], node: [76.67984255, -0.27769418] },
  earth:   { a: [1.00000261, 0.00000562], e: [0.01671123, -0.00004392], I: [-0.00001531, -0.01294668], L: [100.46457166, 35999.37244981], peri: [102.93768193, 0.32327364], node: [0.0, 0.0] },
  mars:    { a: [1.52371034, 0.00001847], e: [0.09339410, 0.00007882], I: [1.84969142, -0.00813131], L: [-4.55343205, 19140.30268499], peri: [-23.94362959, 0.44441088], node: [49.55953891, -0.29257343] },
  jupiter: { a: [5.20288700, -0.00011607], e: [0.04838624, -0.00013253], I: [1.30439695, -0.00183714], L: [34.39644051, 3034.74612775], peri: [14.72847983, 0.21252668], node: [100.47390909, 0.20469106] },
  saturn:  { a: [9.53667594, -0.00125060], e: [0.05386179, -0.00050991], I: [2.48599187, 0.00193609], L: [49.95424423, 1222.49362201], peri: [92.59887831, -0.41897216], node: [113.66242448, -0.28867794] },
  uranus:  { a: [19.18916464, -0.00196176], e: [0.04725744, -0.00004397], I: [0.77263783, -0.00242939], L: [313.23810451, 428.48202785], peri: [170.95427630, 0.40805281], node: [74.01692503, 0.04240589] },
  neptune: { a: [30.06992276, 0.00026291], e: [0.00859048, 0.00005105], I: [1.77004347, 0.00035372], L: [-55.12002969, 218.45945325], peri: [44.96476227, -0.32241464], node: [131.78422574, -0.00508664] },
  pluto:   { a: [39.48211675, -0.00031596], e: [0.24882730, 0.00005170], I: [17.14001206, 0.00004818], L: [238.92903833, 145.20780515], peri: [224.06891629, -0.04062942], node: [110.30393684, -0.01183482] }
};

export const PLANET_NAMES: Record<PlanetKey, string> = { mercury: 'Mercure', venus: 'Vénus', earth: 'Terre', mars: 'Mars', jupiter: 'Jupiter', saturn: 'Saturne', uranus: 'Uranus', neptune: 'Neptune', pluto: 'Pluton' };

export interface IauOrientation {
  a0: number; da0: number; d0: number; dd0: number; W0: number; Wdot: number;
}

// IAU 2015 orientation: pole (alpha0, delta0 in degrees), prime meridian W0 (deg) and Wdot (deg/day), T in Julian centuries.
export const IAU_ORIENTATION: Record<PlanetKey, IauOrientation> = {
  mercury: { a0: 281.0103, da0: 0, d0: 61.4155, dd0: 0, W0: 329.5988, Wdot: 6.1385108 },
  venus:   { a0: 272.76, da0: 0, d0: 67.16, dd0: 0, W0: 160.20, Wdot: -1.4813688 },
  earth:   { a0: 0.00, da0: 0, d0: 90.00, dd0: 0, W0: 190.147, Wdot: 360.9856235 },
  mars:    { a0: 317.269, da0: 0, d0: 54.432, dd0: 0, W0: 176.049, Wdot: 350.891982443 },
  jupiter: { a0: 268.056595, da0: 0, d0: 64.495303, dd0: 0, W0: 284.95, Wdot: 870.536 },
  saturn:  { a0: 40.589, da0: 0, d0: 83.537, dd0: 0, W0: 38.90, Wdot: 810.7939024 },
  uranus:  { a0: 257.311, da0: 0, d0: -15.175, dd0: 0, W0: 203.81, Wdot: -501.1600928 },
  neptune: { a0: 299.36, da0: 0, d0: 43.46, dd0: 0, W0: 253.18, Wdot: 536.3128492 },
  pluto:   { a0: 132.993, da0: 0, d0: -6.163, dd0: 0, W0: 302.695, Wdot: 56.3625225 }
};

export interface BodyPhysical {
  radiusKm: number; tilt: number; rotationHours: number; moons: number; color: number;
}

export const BODY_PHYSICAL: Record<string, BodyPhysical> = {
  sun:     { radiusKm: 696340, tilt: 7.25, rotationHours: 609.12, moons: 0, color: 0xffb347 },
  mercury: { radiusKm: 2439.7, tilt: 0.034, rotationHours: 1407.6, moons: 0, color: 0xb8b0a4 },
  venus:   { radiusKm: 6051.8, tilt: 177.36, rotationHours: -5832.5, moons: 0, color: 0xe6c58e },
  earth:   { radiusKm: 6371.0, tilt: 23.4393, rotationHours: 23.9344696, moons: 1, color: 0x5da9e9 },
  moon:    { radiusKm: 1737.4, tilt: 6.68, rotationHours: 655.72, moons: 0, color: 0xbfbfbf },
  mars:    { radiusKm: 3389.5, tilt: 25.19, rotationHours: 24.622962, moons: 2, color: 0xc1440e },
  jupiter: { radiusKm: 69911, tilt: 3.13, rotationHours: 9.925, moons: 95, color: 0xd8b48c },
  saturn:  { radiusKm: 58232, tilt: 26.73, rotationHours: 10.656, moons: 274, color: 0xe0c48f },
  uranus:  { radiusKm: 25362, tilt: 97.77, rotationHours: -17.24, moons: 28, color: 0x9fe3e8 },
  neptune: { radiusKm: 24622, tilt: 28.32, rotationHours: 16.11, moons: 16, color: 0x4b6fd8 },
  pluto:   { radiusKm: 1188.3, tilt: 122.53, rotationHours: -153.2928, moons: 5, color: 0xc9b8a6 }
};

export interface Satellite {
  key: string;
  parent: PlanetKey;
  name: string;
  radiusKm: number;
  aKm: number;
  periodDays: number;
  incl: number;
  L0: number;
  color: number;
}

export const SATELLITES: Satellite[] = [
  { key: 'io',       parent: 'jupiter', name: 'Io',       radiusKm: 1821.6, aKm: 421800,   periodDays: 1.769137786, incl: 0.036,  L0: 106.077, color: 0xe8d36a },
  { key: 'europa',   parent: 'jupiter', name: 'Europe',   radiusKm: 1560.8, aKm: 671100,   periodDays: 3.551181,    incl: 0.466,  L0: 175.733, color: 0xd8cdbb },
  { key: 'ganymede', parent: 'jupiter', name: 'Ganymède', radiusKm: 2634.1, aKm: 1070400,  periodDays: 7.154553,    incl: 0.177,  L0: 120.558, color: 0xb9a98f },
  { key: 'callisto', parent: 'jupiter', name: 'Callisto', radiusKm: 2410.3, aKm: 1882700,  periodDays: 16.689018,   incl: 0.192,  L0: 84.444,  color: 0x8f857a },
  { key: 'titan',    parent: 'saturn',  name: 'Titan',    radiusKm: 2574.7, aKm: 1221870,  periodDays: 15.945421,   incl: 0.34854, L0: 0,      color: 0xd8a24a },
  { key: 'rhea',     parent: 'saturn',  name: 'Rhéa',     radiusKm: 763.8,  aKm: 527108,   periodDays: 4.518212,    incl: 0.345,  L0: 180,    color: 0xcfc8bd },
  { key: 'iapetus',  parent: 'saturn',  name: 'Japet',    radiusKm: 734.5,  aKm: 3560820,  periodDays: 79.3215,     incl: 15.47,  L0: 90,     color: 0x9a9188 },
  { key: 'triton',   parent: 'neptune', name: 'Triton',   radiusKm: 1353.4, aKm: 354759,   periodDays: -5.876854,   incl: 156.885, L0: 0,     color: 0xc7d6d8 }
];

export interface Comet {
  key: string;
  name: string;
  label: string;
  type: string;
  short: string;
  color: string;
  radiusKm: number;
  rotationHours: number;
  temp: string;
  e: number;
  aAU: number;
  incl: number;
  node: number;
  peri: number;
  tpJD: number;
  periodDays: number;
  perihelia: number[];
  desc: string;
}

/* Comètes : éléments osculateurs héliocentriques au 2026-11-08 (JPL Horizons),
   repère écliptique J2000. e/aAU/incl/node/peri = excentricité, demi-grand axe,
   inclinaison, longitude du nœud ascendant, argument du périhélie.
   perihelia = passages au périhélie relevés sur JPL Horizons ; la phase est
   interpolée entre deux passages consécutifs (les périodes réelles varient de
   plusieurs jours sous l'effet des perturbations planétaires). */
export const COMETS: Comet[] = [
  { key: 'halley', name: '1P/Halley', label: 'Halley', type: 'Comète périodique', short: 'Comète',
    color: '#a7f3d0', radiusKm: 5.5, rotationHours: 52.8, temp: '≈ 200 K (périhélie)',
    e: 0.968038041, aAU: 17.859586, incl: 162.193926, node: 59.243836, peri: 112.144650,
    tpJD: 2474038.9504, periodDays: 27568.0150,
    perihelia: [2418781.597, 2446470.879, 2474034.268],
    desc: "Ellipse très excentrique inclinée à 162° ; la vitesse suit la deuxième loi de Kepler : maximale au périhélie, minimale à l'aphélie. Retour attendu en 2061." },
  { key: 'encke', name: '2P/Encke', label: 'Encke', type: 'Comète périodique', short: 'Comète',
    color: '#f2c9a0', radiusKm: 2.4, rotationHours: 11.08, temp: '≈ 300 K (périhélie)',
    e: 0.847324563, aAU: 2.217748, incl: 11.347809, node: 334.019320, peri: 187.288163,
    tpJD: 2461446.7281, periodDays: 1206.3312,
    perihelia: [
      2397582.009, 2398785.378, 2399989.498, 2401196.157, 2402401.440, 2403606.982, 2404806.199, 2406006.353, 2407205.564, 2408411.765,
      2409619.127, 2410826.736, 2412032.265, 2413237.426, 2414443.313, 2415648.872, 2416862.484, 2418067.477, 2419271.784, 2420475.926,
      2421680.420, 2422887.353, 2424093.255, 2425298.984, 2426498.151, 2427698.098, 2428897.460, 2430103.400, 2431310.062, 2432517.379,
      2433722.726, 2434927.203, 2436131.882, 2437336.956, 2438550.245, 2439756.270, 2440961.562, 2442167.023, 2443372.570, 2444580.042,
      2445787.500, 2446994.168, 2448193.059, 2449392.918, 2450591.875, 2451797.381, 2453003.371, 2454209.642, 2455415.288, 2456618.243,
      2457822.381, 2459026.612, 2460239.823, 2461446.959, 2462653.625, 2463859.247, 2465066.443, 2466274.876, 2467482.412, 2468690.451,
      2469890.123, 2471090.529, 2472290.031, 2473495.175],
    desc: "La comète périodique la plus rapide : un tour en 3,3 ans, sur une orbite courte et peu inclinée. Son noyau d'environ 4,8 km de diamètre alimente l'essaim météoritique des Taurides." },
  { key: 'churyumov', name: '67P/Churyumov-Gerasimenko', label: '67P', type: 'Comète périodique', short: 'Comète',
    color: '#cdb8f2', radiusKm: 2.0, rotationHours: 12.4, temp: '≈ 205 K (périhélie)',
    e: 0.649467876, aAU: 3.458981, incl: 3.865983, node: 36.285609, peri: 22.239806,
    tpJD: 2461871.0621, periodDays: 2349.7448,
    perihelia: [
      2438083.479, 2440475.569, 2442875.758, 2445285.618, 2447695.905, 2450100.155, 2452504.816, 2454890.858, 2457247.589, 2459520.556,
      2461871.122, 2464269.388, 2466688.759, 2469109.917, 2471531.206, 2473952.855],
    desc: "Cible de la mission Rosetta (2014-2016) : noyau bilobé d'environ 4 × 3 km, coma et jets observés in situ. Comète de la famille de Jupiter, période de 6,4 ans." },
  { key: 'swifttuttle', name: '109P/Swift-Tuttle', label: 'Swift-Tuttle', type: 'Comète périodique', short: 'Comète',
    color: '#9fd3ea', radiusKm: 13.0, rotationHours: 0, temp: '≈ 200 K (périhélie)',
    e: 0.963371998, aAU: 26.173044, incl: 112.840426, node: 139.901808, peri: 153.235484,
    tpJD: 2448973.6810, periodDays: 48907.9869,
    perihelia: [2401375.942, 2448968.821, 2497757.889],
    desc: "Le plus gros noyau cométaire périodique connu (~26 km de diamètre), source de l'essaim des Perséides. Orbite rétrograde très inclinée et période d'environ 130 ans." },
  { key: 'halebopp', name: 'C/1995 O1 (Hale-Bopp)', label: 'Hale-Bopp', type: 'Comète à longue période', short: 'Comète',
    color: '#f2b8d3', radiusKm: 30.0, rotationHours: 11.35, temp: '≈ 190 K (périhélie)',
    e: 0.994887146, aAU: 181.260279, incl: 89.731462, node: 281.814145, peri: 130.737557,
    tpJD: 2450536.5239, periodDays: 891358.4659,
    perihelia: [2450539.620],
    desc: "La « grande comète » de 1997, visible à l'œil nu pendant dix-huit mois. Noyau d'environ 60 km, orbite quasi perpendiculaire à l'écliptique (89°) et période de l'ordre de 2 400 ans." }
];

export const COMET_KEYS: string[] = COMETS.map(c => c.key);
export const COMET_BY_KEY: Record<string, Comet> = {};
for (const c of COMETS) COMET_BY_KEY[c.key] = c;
