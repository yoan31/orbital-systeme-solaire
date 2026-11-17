import { useStore } from '../../state/store';

const BADGE: Record<string, { cls: string; text: string }> = {
  local: { cls: 'local', text: 'téléchargé' },
  remote: { cls: 'remote', text: 'distant' },
  procedural: { cls: 'proc', text: 'procédural' },
};

export function CreditsModal() {
  const open = useStore((s) => s.modal === 'credits');
  const gpu = useStore((s) => s.gpu);
  const webgpuState = useStore((s) => s.webgpuState);
  const textureStatus = useStore((s) => s.textureStatus);
  if (!open) return null;

  const keys = Object.keys(textureStatus);
  const counts = { local: 0, remote: 0, procedural: 0 };
  for (const key of keys) counts[textureStatus[key].source] += 1;

  return (
    <div id="creditsModal" className="modal" role="dialog" aria-modal="true" aria-labelledby="creditsTitle">
      <div className="modal-card glass">
        <button className="icon-btn modal-close" id="btnCloseCredits" aria-label="Fermer" onClick={() => useStore.getState().setModal(null)}>
          ✕
        </button>
        <h2 id="creditsTitle">Crédits, sources et transparence</h2>
        <p>
          Simulation héliocentrique à éphémérides képlériennes NASA/JPL. Les positions sont recalculées depuis le Jour Julien à chaque image
          (aucune intégration incrémentale).
        </p>
        <p id="sysInfo" className="sysinfo">
          Moteur : WebGL2 · GPU : {gpu.name}
          {gpu.software ? ' (logiciel)' : ''} · WebGPU :{' '}
          {webgpuState.includes('dispo') ? 'disponible (rendu WebGL2)' : 'non disponible'}
        </p>
        <h3>Textures</h3>
        <ul>
          <li>
            <b>Solar System Scope</b> — textures planétaires 2K/4K, Voie lactée, anneau de Saturne. Licence <b>CC BY 4.0</b>, attribution
            obligatoire. <a href="https://www.solarsystemscope.com/textures/" target="_blank" rel="noopener">solarsystemscope.com/textures</a>.
            Fichiers téléchargés localement ; conversion TIF→PNG et réduction 8K→4K (Terre, Voie lactée) effectuées pour la mémoire GPU.
          </li>
          <li>
            <b>three.js</b> — textures Terre/Lune de démonstration (MIT), miroirs jsDelivr.{' '}
            <a href="https://github.com/mrdoob/three.js" target="_blank" rel="noopener">github.com/mrdoob/three.js</a>.
          </li>
          <li>
            <b>Miroirs de secours</b> vérifiés HTTP 200 (jsDelivr) : dépôts GitHub <code>rajpatel5/Solar-System</code>,{' '}
            <code>Daniel-Geo/solar-system</code>, <code>Shrey1803/Solar-system</code>, <code>mrdoob/three.js@r160</code>.
          </li>
          <li>
            <b>Pluton</b> : texture procédurale (bonus, aucune texture officielle redistribuée). Anneaux d'Uranus : procéduraux, comme demandé.
          </li>
        </ul>
        <h3>Éphémérides et données</h3>
        <ul>
          <li>
            <b>NASA/JPL</b> — E. M. Standish, <i>Keplerian Elements for Approximate Positions of the Major Planets</i>, table 1 (1800–2050),
            éléments et taux par siècle.
          </li>
          <li>
            <b>Lune</b> — modèle analytique tronqué de J. Meeus, <i>Astronomical Algorithms</i>, ch. 47 ; nœud rétrograde et inclinaison inclus.
          </li>
          <li>
            <b>Orientations</b> — pôles et méridiens IAU 2015 ; précession terrestre approchée pour les saisons.
          </li>
          <li>
            <b>Comètes</b> — 1P/Halley, 2P/Encke, 67P/Churyumov-Gerasimenko, 109P/Swift-Tuttle, C/1995 O1 (Hale-Bopp) : éléments osculateurs JPL
            Horizons à l'époque 2026-11-08, phase calée sur les passages au périhélie observés.
          </li>
          <li>
            <b>Données physiques</b> — NASA Planetary Fact Sheet ; nombres de lunes confirmées (2025).
          </li>
        </ul>
        <h3>Météo réelle et météo solaire</h3>
        <ul>
          <li>
            <b>NASA GIBS / EOSDIS</b> (domaine public) : mosaïque <code>MODIS_Terra_CorrectedReflectance_TrueColor</code> (archive journalière,
            tuiles WMTS EPSG:4326, CORS vérifié). Les tuiles GOES-East/West et Himawari sont publiques et CORS, mais leur projection
            géostationnaire n'est pas directement alignable sur la sphère équirectangulaire ; elles ne sont donc pas plaquées sur le globe.{' '}
            <a href="https://gibs.earthdata.nasa.gov/" target="_blank" rel="noopener">gibs.earthdata.nasa.gov</a>
          </li>
          <li>
            <b>Open-Meteo</b> (gratuit, non commercial, sans clé) : nébulosité mondiale en direct, interpolation d'une grille 10°, et conditions
            locales au clic (température, vent, pression, nuages). CORS vérifié.{' '}
            <a href="https://open-meteo.com/" target="_blank" rel="noopener">open-meteo.com</a>
          </li>
          <li>
            <b>NASA SDO</b> (domaine public) : images 193 Å, 304 Å et lumière visible en panneau 2D. Les en-têtes CORS absents empêchent leur
            usage comme texture WebGL ; aucun contournement.{' '}
            <a href="https://sdo.gsfc.nasa.gov/" target="_blank" rel="noopener">sdo.gsfc.nasa.gov</a>
          </li>
          <li>
            <b>NOAA SWPC</b> (domaine public) : éruptions, flux X, probabilités, Kp, échelles R/S/G, vent solaire, Bz, alertes, Ovation,
            prévision 3 jours. CORS vérifié. Les URL <code>products/solar-wind/...</code> de la spécification renvoient 404 ; les flux actifs
            utilisés sont <code>json/rtsw/rtsw_wind_1m.json</code> et <code>json/rtsw/rtsw_mag_1m.json</code>.{' '}
            <a href="https://www.swpc.noaa.gov/" target="_blank" rel="noopener">swpc.noaa.gov</a>
          </li>
        </ul>
        <h3>Moteur et compromis</h3>
        <ul>
          <li>three.js <b>0.187</b> via Vite + React Three Fiber, WebGL2, tone mapping ACES (en fin de chaîne HDR), SMAA, bloom, sRGB.</li>
          <li>
            <b>WebGPU</b> : détecté s'il est disponible, mais le rendu reste sur WebGL2 pour conserver les shaders personnalisés (anneaux,
            atmosphère, ceintures) et le post-traitement. Repli automatique WebGL2.
          </li>
          <li>
            Mode <b>pédagogique</b> : distances ∝ r<sup>0,55</sup>, rayons ∝ R<sup>0,4</sup>, orbites des lunes élargies. Aucune prétention
            physique dans ce mode ; le mode réaliste utilise les rayons et distances réels.
          </li>
          <li>
            Éclairage solaire en 1/d² en mode réaliste ; l'exposition est adaptée à l'astre suivi (équivalent d'une adaptation d'exposition
            photographique). En mode pédagogique l'intensité est renormalisée.
          </li>
          <li>
            Les astéroïdes, comètes et lunes ne sont pas à l'échelle visuelle ; leurs éléments orbitaux et périodes sont réels. Ombres
            planète↔anneaux analytiques ; pas de shadow map globale.
          </li>
          <li>
            <b>Post-traitement</b> : god rays aux paliers élevé/ultra, depth of field (rayon de confusion reconstruit depuis la profondeur
            logarithmique) au palier ultra, vignette à partir du palier moyen, SMAA partout.
          </li>
        </ul>
        <h3>Précision attendue</h3>
        <ul>
          <li>
            <b>Planètes</b> (Standish table 1, 1800–2050) : erreur typique de l'ordre de 10<sup>-4</sup> à 10<sup>-3</sup> UA, soit 10
            <sup>4</sup>–10<sup>5</sup> km. À l'échelle du système, l'écart reste inférieur à la taille d'un pixel.
          </li>
          <li>
            <b>Lune</b> : modèle Meeus tronqué, précision de l'ordre de la minute d'arc et quelques dizaines de kilomètres sur la distance.
          </li>
          <li>
            <b>Lunes majeures</b> : périodes, demi-grands axes et inclinaisons réels ; phases initiales et orbites circulaires simplifiées.
          </li>
          <li>
            <b>Comète</b> : éléments osculateurs ; la position se dégrade pour les dates éloignées (perturbations planétaires non intégrées).
          </li>
        </ul>
        <h3>État des textures au chargement</h3>
        <div id="textureStatus" className="tex-grid">
          {keys.length === 0 ? (
            <div className="tex-row">
              <span>chargement…</span>
              <span className="badge">—</span>
            </div>
          ) : (
            keys.map((key) => (
              <div className="tex-row" key={key} title={textureStatus[key].url || 'généré'}>
                <span>{key}</span>
                <span className={`badge ${BADGE[textureStatus[key].source].cls}`}>{BADGE[textureStatus[key].source].text}</span>
              </div>
            ))
          )}
        </div>
        <p className="note">
          {counts.local} locale(s) · {counts.remote} à distance · {counts.procedural} procédurale(s)
        </p>
        <h3>Raccourcis</h3>
        <p>
          <span className="kbd">Espace</span> lecture/pause · <span className="kbd">R</span> maintenant · <span className="kbd">T</span> dessus ·{' '}
          <span className="kbd">C</span> côté · <span className="kbd">E</span> depuis la Terre · <span className="kbd">F</span> suivre ·{' '}
          <span className="kbd">←</span>/<span className="kbd">→</span> ±1 jour · <span className="kbd">1</span>–<span className="kbd">9</span>{' '}
          astres.
        </p>
      </div>
    </div>
  );
}
