import { useStore } from '../state/store';
import { formatUTC } from '../lib/format';
import { openModal } from './actions';

export function TopBar() {
  const jd = useStore((s) => s.jd);
  const fps = useStore((s) => s.fps);
  const outOfRange = useStore((s) => s.outOfRange);
  const gpu = useStore((s) => s.gpu);
  const webgpuState = useStore((s) => s.webgpuState);

  return (
    <header id="topbar" className="glass">
      <div className="brand">
        <div className="brand-mark">◉</div>
        <div>
          <b>ORBITAL</b>
          <small>Système solaire · éphémérides JPL</small>
        </div>
      </div>
      <div className="chips center">
        <div className="chip">
          <span className="chip-k">UTC</span>
          <span>{formatUTC(jd)}</span>
        </div>
        <div className="chip">
          <span className="chip-k">JD</span>
          <span>{jd.toFixed(5)}</span>
        </div>
        {outOfRange ? (
          <div className="chip" id="chipRange">
            HORS PLAGE 1800–2050
          </div>
        ) : null}
      </div>
      <div className="chips right">
        <div className="chip" id="chipEngine" title={webgpuState}>
          <span className="chip-k">MOTEUR</span>
          <span>{webgpuState}</span>
        </div>
        <div className="chip" id="chipGPU" title={gpu.name} style={gpu.software ? { color: 'var(--warn)' } : undefined}>
          <span className="chip-k">GPU</span>
          <span>{gpu.short}</span>
        </div>
        <div className={`chip${fps < 40 ? ' bad' : fps < 50 ? ' warn' : ''}`} id="chipFPS" title="Images par seconde">
          <span>{Math.round(fps)}</span>&nbsp;FPS
        </div>
        <button className="icon-btn" id="btnSolarTop" title="Panneau météo solaire" aria-label="Ouvrir le panneau météo solaire" onClick={() => openModal('solar')}>
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4" />
          </svg>
        </button>
        <button className="icon-btn" id="btnHelp" title="Aide et raccourcis" aria-label="Aide et raccourcis" onClick={() => openModal('help')}>
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" />
            <path d="M9.6 9.4a2.5 2.5 0 1 1 3.9 2c-.9.6-1.5 1.1-1.5 2.2" />
            <path d="M12 17.2h.01" />
          </svg>
        </button>
        <button className="icon-btn" id="btnCredits" title="Crédits et textures" aria-label="Crédits et textures" onClick={() => openModal('credits')}>
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 11v5.2" />
            <path d="M12 7.8h.01" />
          </svg>
        </button>
      </div>
    </header>
  );
}
