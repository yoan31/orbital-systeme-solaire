import { useMemo } from 'react';
import { useStore } from '../state/store';
import { buildInfo } from '../render/infoStats';
import { focusBody, setFollow } from '../render/camera';
import { WeatherCard } from './WeatherCard';
import { closePanels } from './uiState';

export function RightPanel() {
  const open = useStore((s) => s.mobilePanel === 'right');
  const selected = useStore((s) => s.selected);
  const jd = useStore((s) => s.jd);
  const follow = useStore((s) => s.follow);
  const debugLight = useStore((s) => s.debugLight);
  const debugHud = useStore((s) => s.debugHud);

  const info = useMemo(() => buildInfo(selected, jd), [selected, jd]);

  return (
    <aside id="rightPanel" className={`panel glass${open ? ' open' : ''}`} aria-label="Fiche de l'astre">
      <div className="panel-head">
        <h2 id="infoName">{info.name}</h2>
        <button className="icon-btn small panel-close" data-close="right" aria-label="Fermer" onClick={closePanels}>
          ✕
        </button>
      </div>
      <div id="infoType" className="eyebrow">
        {info.type}
      </div>
      <div id="infoDesc" className="desc">
        {info.desc}
      </div>
      <div className="info-actions">
        <button
          id="followBtn"
          className={follow === selected ? 'active' : ''}
          onClick={() => {
            if (follow === selected) {
              setFollow(null);
              useStore.setState({ follow: null });
            } else {
              focusBody(selected);
            }
          }}
        >
          Suivre
        </button>
        <button
          id="freeBtn"
          onClick={() => {
            setFollow(null);
            useStore.setState({ follow: null });
          }}
        >
          Vue libre
        </button>
      </div>
      <WeatherCard />
      <div id="debugCard" className={`debug-card${debugLight ? '' : ' hidden'}`} aria-live="polite">
        <div className="debug-head">
          <span className="debug-title">Debug éclairage</span>
          <span id="dbgBadge" className={`weather-badge ${debugLight ? 'warn' : 'off'}`}>
            {debugLight ? 'ACTIF' : 'OFF'}
          </span>
        </div>
        <div className="debug-grid">
          <div>
            <span>Point subsolaire</span>
            <b id="dbgSubsolar">{debugHud.subsolar}</b>
          </div>
          <div>
            <span>Rotation Terre (ERA)</span>
            <b id="dbgEra">{debugHud.era}</b>
          </div>
          <div>
            <span>Point sous la caméra</span>
            <b id="dbgNadir">{debugHud.nadir}</b>
          </div>
          <div>
            <span>Direction Soleil (monde)</span>
            <b id="dbgSunDir">{debugHud.sunDir}</b>
          </div>
        </div>
        <div id="dbgAsserts" className={`debug-assert ${debugLight ? (debugHud.assertsOk === debugHud.assertsTotal ? 'ok' : 'err') : ''}`}>
          {debugLight ? `Assertions subsolaires : ${debugHud.assertsOk}/${debugHud.assertsTotal} sous 1°` : '—'}
        </div>
      </div>
      <div id="infoStats" className="stats">
        {info.stats.map((row) => (
          <div className="stat" key={row.label}>
            <span>{row.label}</span>
            <b>{row.value}</b>
            {row.sub ? <small>{row.sub}</small> : null}
          </div>
        ))}
      </div>
      <div id="infoExtra" className="extra">
        {info.tags.map((tag) => (
          <span className={tag.hot ? 'tag hot' : 'tag'} key={tag.text}>
            {tag.text}
          </span>
        ))}
      </div>
    </aside>
  );
}
