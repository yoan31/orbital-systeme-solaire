export interface TextureDef {
  local: string | null;
  srgb: boolean;
  kind: string;
  label: string;
  remote: string[];
  clamp?: boolean;
  expected?: boolean;
}

export const TEXTURE_DEFS = {
  sun: {
    local: 'textures/sun.jpg', srgb: true, kind: 'sun', label: 'Soleil 4K',
    remote: ['https://cdn.jsdelivr.net/gh/Shrey1803/Solar-system@main/textures/2k_sun.jpg']
  },
  mercury: {
    local: 'textures/mercury.jpg', srgb: true, kind: 'mercury', label: 'Mercure 2K',
    remote: ['https://cdn.jsdelivr.net/gh/rajpatel5/Solar-System@master/2k_mercury.jpg',
             'https://cdn.jsdelivr.net/gh/Daniel-Geo/solar-system@main/textures/2k_mercury.jpg']
  },
  venusSurface: {
    local: 'textures/venus_surface.jpg', srgb: true, kind: 'venusSurface', label: 'Vénus surface 2K',
    remote: ['https://cdn.jsdelivr.net/gh/Shrey1803/Solar-system@main/textures/2k_venus_surface.jpg']
  },
  venusAtmosphere: {
    local: 'textures/venus_atmosphere.jpg', srgb: true, kind: 'venusAtmosphere', label: 'Vénus nuages 2K',
    remote: ['https://cdn.jsdelivr.net/gh/Daniel-Geo/solar-system@main/textures/2k_venus_atmosphere.jpg']
  },
  earthDay: {
    local: 'textures/earth_day.jpg', srgb: true, kind: 'earthDay', label: 'Terre jour 4K',
    remote: ['https://cdn.jsdelivr.net/gh/mrdoob/three.js@r160/examples/textures/planets/earth_atmos_4096.jpg',
             'https://cdn.jsdelivr.net/gh/rajpatel5/Solar-System@master/2k_earth.jpg']
  },
  earthNight: {
    local: 'textures/earth_night.jpg', srgb: true, kind: 'earthNight', label: 'Terre nuit 4K',
    remote: ['https://cdn.jsdelivr.net/gh/mrdoob/three.js@r160/examples/textures/planets/earth_lights_2048.png']
  },
  earthClouds: {
    local: 'textures/earth_clouds.jpg', srgb: true, kind: 'clouds', label: 'Terre nuages 2K',
    remote: ['https://cdn.jsdelivr.net/gh/mrdoob/three.js@r160/examples/textures/planets/earth_clouds_2048.png']
  },
  earthNormal: {
    local: 'textures/earth_normal.png', srgb: false, kind: 'normal', label: 'Terre relief 2K',
    remote: ['https://cdn.jsdelivr.net/gh/mrdoob/three.js@r160/examples/textures/planets/earth_normal_2048.jpg']
  },
  earthSpecular: {
    local: 'textures/earth_specular.png', srgb: false, kind: 'specular', label: 'Terre spéculaire 2K',
    remote: ['https://cdn.jsdelivr.net/gh/mrdoob/three.js@r160/examples/textures/planets/earth_specular_2048.jpg']
  },
  moon: {
    local: 'textures/moon.jpg', srgb: true, kind: 'moon', label: 'Lune 2K',
    remote: ['https://cdn.jsdelivr.net/gh/Daniel-Geo/solar-system@main/textures/2k_moon.jpg',
             'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r160/examples/textures/planets/moon_1024.jpg']
  },
  mars: {
    local: 'textures/mars.jpg', srgb: true, kind: 'mars', label: 'Mars 2K',
    remote: ['https://cdn.jsdelivr.net/gh/rajpatel5/Solar-System@master/2k_mars.jpg',
             'https://cdn.jsdelivr.net/gh/Daniel-Geo/solar-system@main/textures/2k_mars.jpg']
  },
  jupiter: {
    local: 'textures/jupiter.jpg', srgb: true, kind: 'jupiter', label: 'Jupiter 2K',
    remote: ['https://cdn.jsdelivr.net/gh/rajpatel5/Solar-System@master/2k_jupiter.jpg',
             'https://cdn.jsdelivr.net/gh/Daniel-Geo/solar-system@main/textures/2k_jupiter.jpg']
  },
  saturn: {
    local: 'textures/saturn.jpg', srgb: true, kind: 'saturn', label: 'Saturne 2K',
    remote: ['https://cdn.jsdelivr.net/gh/rajpatel5/Solar-System@master/2k_saturn.jpg',
             'https://cdn.jsdelivr.net/gh/Daniel-Geo/solar-system@main/textures/2k_saturn.jpg']
  },
  saturnRing: {
    local: 'textures/saturn_ring.png', srgb: true, kind: 'ring', label: 'Anneau Saturne 2K', clamp: true,
    remote: ['https://www.solarsystemscope.com/textures/download/2k_saturn_ring_alpha.png']
  },
  uranus: {
    local: 'textures/uranus.jpg', srgb: true, kind: 'uranus', label: 'Uranus 2K',
    remote: ['https://cdn.jsdelivr.net/gh/rajpatel5/Solar-System@master/2k_uranus.jpg']
  },
  neptune: {
    local: 'textures/neptune.jpg', srgb: true, kind: 'neptune', label: 'Neptune 2K',
    remote: ['https://cdn.jsdelivr.net/gh/rajpatel5/Solar-System@master/2k_neptune.jpg']
  },
  pluto: {
    local: null, srgb: true, kind: 'pluto', label: 'Pluton (procédural)', remote: [], expected: true
  },
  milkyway: {
    local: 'textures/stars_milkyway.jpg', srgb: true, kind: 'milkyway', label: 'Voie lactée 4K',
    remote: ['https://cdn.jsdelivr.net/gh/Shrey1803/Solar-system@main/textures/2k_stars_milky_way.jpg']
  },
  starsLayer: {
    local: 'textures/stars.jpg', srgb: true, kind: 'stars', label: 'Étoiles 2K', remote: []
  }
} satisfies Record<string, TextureDef>;

export type TextureKey = keyof typeof TEXTURE_DEFS;

export const TEXTURE_KEYS = Object.keys(TEXTURE_DEFS) as TextureKey[];
