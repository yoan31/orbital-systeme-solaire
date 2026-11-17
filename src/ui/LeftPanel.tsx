import { COMET_BY_KEY } from '../astro/constants';
import { BODY_INFO, BODY_LIST } from '../astro/info';
import { QUALITY_TIERS } from '../astro/quality';
import type { QualityName } from '../astro/quality';
import { useStore } from '../state/store';
import type { LayerKey } from '../state/store';
import { earthWeather } from '../services/earthWeather';
import { solarWeather } from '../services/solarWeather';
import { applyQuality, openModal, selectMode, showView, switchLayer } from './actions';
import { closePanels } from './uiState';

const LAYER_ROWS: { key: LayerKey; label: string }[] = [
  { key: 'orbits', label: 'Orbites' },
  { key: 'labels', label: 'Noms' },
  { key: 'grid', label: 'Plan écliptique + grille UA' },
  { key: 'velocity', label: 'Vecteurs vitesse' },
  { key: 'axes', label: 'Axes de rotation' },
  { key: 'belts', label: 'Ceintures' },
  { key: 'comets', label: 'Comètes' },
  { key: 'satellites', label: 'Satellites majeurs' },
  { key: 'atmospheres', label: 'Atmosphères' },
];

export function LeftPanel() {
  const open = useStore((s) => s.mobilePanel === 'left');
  const selected = useStore((s) => s.selected);
  const layers = useStore((s) => s.layers);
  const mode = useStore((s) => s.mode);
  const quality = useStore((s) => s.quality);
  const tier = useStore((s) => s.tier);
  const debugLight = useStore((s) => s.debugLight);
  const solar = useStore((s) => s.solar);

  const tierConfig = QUALITY_TIERS[tier];
  const beltCount = tierConfig.asteroids.toLocaleString('fr-FR');
  const bloomState = tierConfig.bloom > 0.02 ? 'actif' : 'désactivé';
  const perfNote =
    quality === 'auto'
      ? `Auto : palier ${tierConfig.label} · FPS < 40 → réduction progressive, pixel ratio et bloom ajustés.`
      : `Palier manuel ${tierConfig.label} · ${beltCount} astéroïdes.`;

  return (
    <aside id="leftPanel" className={`panel glass${open ? ' open' : ''}`} aria-label="Corps célestes et options">
      <div className="panel-head">
        <h2>Corps célestes</h2>
        <button className="icon-btn small panel-close" data-close="left" aria-label="Fermer" onClick={closePanels}>
          ✕
        </button>
      </div>
      <div id="bodyList" className="body-list" role="list">
        {BODY_LIST.map((key) => {
          const info = BODY_INFO[key];
          const isComet = !!COMET_BY_KEY[key];
          return (
            <button
              key={key}
              className={`body-item${key === selected ? ' active' : ''}${isComet && !layers.comets ? ' hidden' : ''}`}
              data-key={key}
              role="listitem"
              title={`${info.name} — ${info.type}`}
              aria-current={key === selected ? 'true' : 'false'}
              onClick={() => {
                useStore.getState().select(key, true);
                if (window.innerWidth <= 980) closePanels();
              }}
            >
              <span className="dot" style={{ color: info.color }} />
              <span className="bi-name">{info.name}</span>
              <span className="bi-type">{info.short}</span>
            </button>
          );
        })}
      </div>

      <div className="panel-sep" />
      <div className="panel-head">
        <h3>Affichage</h3>
      </div>
      <div className="controls-grid" id="layerControls">
        {LAYER_ROWS.map((row) => (
          <label className="switch-row" key={row.key}>
            <span>{row.label}</span>
            <span className="sw">
              <input type="checkbox" data-layer={row.key} checked={layers[row.key]} onChange={(e) => switchLayer(row.key, e.target.checked)} />
              <i />
            </span>
          </label>
        ))}
        <label className="switch-row">
          <span>Météo réelle</span>
          <span className="sw">
            <input
              id="earthWeatherSwitch"
              type="checkbox"
              checked={layers.earthWeather}
              onChange={(e) => {
                switchLayer('earthWeather', e.target.checked);
                earthWeather.setEnabled(e.target.checked);
              }}
            />
            <i />
          </span>
        </label>
        <label className="switch-row">
          <span>Météo solaire</span>
          <span className="sw">
            <input
              id="solarWeatherSwitch"
              type="checkbox"
              checked={layers.solarWeather}
              onChange={(e) => {
                switchLayer('solarWeather', e.target.checked);
                solarWeather.setEnabled(e.target.checked);
              }}
            />
            <i />
          </span>
        </label>
        <label className="switch-row long">
          <span>Mode debug éclairage</span>
          <span className="sw">
            <input id="debugLightSwitch" type="checkbox" checked={debugLight} onChange={(e) => useStore.getState().setDebugLight(e.target.checked)} />
            <i />
          </span>
        </label>
      </div>

      <div className="panel-sep" />
      <div className="panel-head">
        <h3>Échelle</h3>
      </div>
      <div className="seg" id="modeSeg" role="group" aria-label="Échelle">
        <button data-mode="ped" className={mode === 'ped' ? 'active' : ''} onClick={() => selectMode('ped')}>
          Pédagogique
        </button>
        <button data-mode="real" className={mode === 'real' ? 'active' : ''} onClick={() => selectMode('real')}>
          Réaliste
        </button>
      </div>
      <div
        className="note"
        id="scaleNote"
        dangerouslySetInnerHTML={{
          __html:
            mode === 'real'
              ? '<b>Échelle réelle</b> : 1 UA = 400 unités, rayons et distances réels. Planètes minuscules à l’échelle du système ; astéroïdes et comètes à taille symbolique.'
              : '<b>Échelle pédagogique</b> : distances ∝ r<sup>0,55</sup>, rayons ∝ R<sup>0,4</sup>, orbites des lunes élargies. Volontairement non physique ; astéroïdes, lunes et comètes à taille symbolique.',
        }}
      />

      <div className="panel-sep" />
      <div className="panel-head">
        <h3>Caméra</h3>
      </div>
      <div className="view-buttons">
        <button data-view="top" title="Vue au-dessus de l'écliptique" onClick={() => showView('top')}>
          Dessus
        </button>
        <button data-view="side" title="Vue de côté, dans l'écliptique" onClick={() => showView('side')}>
          Côté
        </button>
        <button data-view="earth" title="Regarder le Soleil depuis la Terre" onClick={() => showView('earth')}>
          Depuis la Terre
        </button>
      </div>

      <div className="panel-sep" />
      <div className="panel-head">
        <h3>Qualité</h3>
      </div>
      <select id="qualitySel" aria-label="Qualité de rendu" value={quality} onChange={(e) => applyQuality(e.target.value as QualityName)}>
        <option value="auto">Auto (FPS &lt; 40 : réduction)</option>
        <option value="low">Bas</option>
        <option value="medium">Moyen</option>
        <option value="high">Élevé</option>
        <option value="ultra">Ultra</option>
      </select>
      <div className="note">
        Astéroïdes instanciés : <b id="beltCount">{beltCount}</b> · bloom <b id="bloomState">{bloomState}</b>
      </div>
      <div className="note" id="perfNote">
        {perfNote}
      </div>

      <div className="panel-sep" />
      <div className="panel-head">
        <h3>Météo spatiale</h3>
      </div>
      <div className="solar-compact">
        <span id="solarCompactBadge" className={`weather-badge ${solar.badgeClass === 'ok' ? 'live' : solar.badgeClass}`}>
          {solar.badge}
        </span>
        <span id="solarCompactText">{solar.body || 'Chargement…'}</span>
      </div>
      <button id="btnSolarPanel" className="wide-btn" onClick={() => openModal('solar')}>
        Panneau météo solaire →
      </button>
      <div className="note">NASA SDO · NOAA SWPC. Hors date simulée, effets réels désactivés.</div>

      <div className="foot-credit">
        Textures Solar System Scope (CC BY 4.0) · NASA/JPL · three.js (MIT).
        <br />
        Météo : NASA GIBS/EOSDIS · Open-Meteo · NOAA SWPC · NASA SDO.
        <br />
        <button id="footCredits" onClick={() => openModal('credits')}>
          Crédits complets et état des textures →
        </button>
      </div>
    </aside>
  );
}
