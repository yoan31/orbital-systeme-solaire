# ORBITAL — Système solaire 3D

Simulation 3D interactive du système solaire dans une seule page HTML, sans build ni backend.
Positions héliocentriques recalculées depuis le Jour Julian à chaque image ; textures réelles des
planètes, météo terrestre et activité solaire en direct.

**Démo en ligne :** https://yoan31.github.io/orbital-systeme-solaire/

## Lancer en local

```bash
python3 -m http.server 8000
# http://localhost:8000
```

`file://` ne fonctionne pas : les navigateurs bloquent le chargement des textures locales.

## Contenu

| Fichier | Rôle |
|---|---|
| `index.html` | Application complète (HTML + CSS + JS, three.js 0.160 via CDN) |
| `textures/` | Textures planétaires 2K–4K |
| `download_textures.py` | Script de récupération / régénération des textures |
| `CREDITS.txt` | Licences et sources détaillées |

## Déploiement

Site statique : GitHub Pages sert directement la racine du dépôt (`index.html`).
Aucune compilation, aucun secret, aucune variable d'environnement.

## Sources et licences

- Textures : [Solar System Scope](https://www.solarsystemscope.com/textures/) — CC BY 4.0
- Moteur : [three.js](https://github.com/mrdoob/three.js) r160 — MIT
- Météo : [Open-Meteo](https://open-meteo.com/)
- Imagerie Terre : [NASA GIBS](https://gibs.earthdata.nasa.gov/)
- Activité solaire : [NOAA SWPC](https://www.swpc.noaa.gov/), [SDO/NASA](https://sdo.gsfc.nasa.gov/)

Voir `CREDITS.txt` pour l'attribution fichier par fichier.
