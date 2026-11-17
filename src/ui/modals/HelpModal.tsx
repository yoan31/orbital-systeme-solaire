import { useStore } from '../../state/store';

export function HelpModal() {
  const open = useStore((s) => s.modal === 'help');
  if (!open) return null;
  return (
    <div id="helpModal" className="modal" role="dialog" aria-modal="true" aria-labelledby="helpTitle">
      <div className="modal-card glass">
        <button className="icon-btn modal-close" id="btnCloseHelp" aria-label="Fermer" onClick={() => useStore.getState().setModal(null)}>
          ✕
        </button>
        <h2 id="helpTitle">Aide</h2>
        <p>
          Cliquez un astre (dans la scène ou la liste) pour le sélectionner et animer la caméra. Glissez pour tourner, molette/pincez pour
          zoomer, clic droit ou deux doigts pour déplacer.
        </p>
        <p>
          <b>Lancement :</b> <span className="kbd">npm install</span> puis <span className="kbd">npm run dev</span>, ou en statique{' '}
          <span className="kbd">npm run build</span> + <span className="kbd">npm run preview</span>.
        </p>
        <h3>Météo réelle et solaire</h3>
        <p>
          Les interrupteurs « Météo réelle » et « Météo solaire » (panneau de gauche) activent les modules. La météo de la Terre et les effets
          solaires ne sont appliqués qu'à ±3 h de l'heure réelle ; hors de cette fenêtre, la Terre utilise l'archive GIBS (dates passées) ou les
          nuages procéduraux, et les effets solaires réels sont désactivés avec un badge explicite. Les images SDO restent visibles en 2D.
        </p>
        <h3>Lecture des données</h3>
        <ul>
          <li>Les distances sont en UA (1 UA = 149 597 870,7 km) et en kilomètres.</li>
          <li>La vitesse orbitale est dérivée de l'ellipse osculatrice (vis-viva), en km/s.</li>
          <li>La Lune affiche sa phase, son élongation et les éclipses géocentriques détectées par alignement réel.</li>
          <li>Le Jour Julien (JD) est affiché en permanence ; la date est en UTC.</li>
        </ul>
        <h3>Mode réaliste</h3>
        <p>
          Rayons et distances réels : les planètes sont minuscules à l'échelle du système. Zoomez sur un astre (ou utilisez la liste) pour
          l'observer. La profondeur logarithmique évite le z-fighting.
        </p>
        <h3>Limites</h3>
        <ul>
          <li>Validité des éléments planétaires : 1800–2050 (extrapolation possible mais signalée).</li>
          <li>
            Lunes majeures : orbites circulaires dans le plan équatorial du parent, phases initiales approchées ; seules les périodes,
            demi-grands axes et inclinaisons sont réalistes.
          </li>
          <li>Pas de précession des pôles des autres planètes, pas de perturbations mutuelles, pas de marées.</li>
        </ul>
      </div>
    </div>
  );
}
