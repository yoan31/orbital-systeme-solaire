import { useStore } from '../state/store';

export function Loader() {
  const done = useStore((s) => s.loaderDone);
  return (
    <div id="loader" className={done ? 'done' : ''} aria-live="polite">
      <div className="loader-inner">
        <div className="loader-orbit">
          <div className="ring" />
          <div className="ring r2" />
          <div className="ring r3" />
          <div className="core" />
          <div className="orb" />
          <div className="orb b" />
        </div>
        <div className="loader-brand">ORBITAL</div>
        <div className="loader-sub">Chargement du système solaire</div>
        <div className="loader-bar">
          <i id="loadBar" />
        </div>
        <div className="loader-meta">
          <span id="loadStatus">Initialisation du moteur…</span>
          <span id="loadPct">0 %</span>
        </div>
        <div className="loader-note">
          Textures Solar System Scope · éphémérides NASA/JPL · <b>three.js 0.187</b>
        </div>
      </div>
    </div>
  );
}
