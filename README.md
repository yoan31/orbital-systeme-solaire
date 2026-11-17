# ORBITAL — Système solaire 3D

Simulation 3D interactive du système solaire.
Positions héliocentriques recalculées depuis le Jour Julian à chaque image ; textures réelles des
planètes, météo terrestre et activité solaire en direct. Cinq comètes célèbres sont simulées sur
leurs éléments osculateurs JPL (Halley, Encke, 67P, Swift-Tuttle, Hale-Bopp).

**Démo en ligne :** https://yoan31.github.io/orbital-systeme-solaire/

## Lancer en local

```bash
npm install
npm run dev
# http://localhost:5173/orbital-systeme-solaire/
```

Build de production :

```bash
npm run build
npm run preview
```

## Contenu

| Fichier | Rôle |
|---|---|
| `src/` | Application Vite + React 19 + TypeScript + React Three Fiber |
| `src/astro/` | Éphémérides pures (Standish JPL, Meeus ch. 47, IAU 2015) |
| `src/scene/` | Corps célestes, ceintures, ciel, grilles |
| `src/render/` | Boucle, caméra, étiquettes, post-traitement |
| `src/shaders/` | GLSL portés du moteur d'origine (profondeur logarithmique incluse) |
| `public/textures/` | Textures planétaires 2K–4K |
| `download_textures.py` | Script de récupération / régénération des textures |
| `CREDITS.txt` | Licences et sources détaillées |

## Stack

React 19, React Three Fiber 9, three.js 0.187, postprocessing (god rays, depth of field compatible
profondeur logarithmique, bloom, SMAA, vignette, ACES), zustand, Vite 8, TypeScript strict.

## Déploiement

GitHub Actions construit le site et le publie sur GitHub Pages :
`.github/workflows/deploy.yml` (push sur `main` ou déclenchement manuel). Le `base` de Vite vaut
`/orbital-systeme-solaire/`, les assets sont servis sous ce préfixe.

## Sources et licences

- Textures : [Solar System Scope](https://www.solarsystemscope.com/textures/) — CC BY 4.0
- Moteur : [three.js](https://github.com/mrdoob/three.js) r187 — MIT
- Météo : [Open-Meteo](https://open-meteo.com/)
- Imagerie Terre : [NASA GIBS](https://gibs.earthdata.nasa.gov/)
- Activité solaire : [NOAA SWPC](https://www.swpc.noaa.gov/), [SDO/NASA](https://sdo.gsfc.nasa.gov/)

Voir `CREDITS.txt` pour l'attribution fichier par fichier.
