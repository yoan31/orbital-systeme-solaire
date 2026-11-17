import { useEffect, useState } from 'react';
import { useStore } from '../state/store';
import { clock } from '../state/clock';
import { applyDateInput, goToNow, reverseTime, setSpeed, togglePlayback } from './actions';
import { dateInputValue, fmtSpeedScale } from '../lib/format';

const PRESETS = [
  { speed: 1, label: 'Temps réel' },
  { speed: 60, label: '1 min/s' },
  { speed: 3600, label: '1 h/s' },
  { speed: 86400, label: '1 jour/s' },
  { speed: 604800, label: '1 sem/s' },
  { speed: 2592000, label: '1 mois/s' },
  { speed: 31557600, label: '1 an/s' },
];

export function TimeDock() {
  const jd = useStore((s) => s.jd);
  const playing = useStore((s) => s.playing);
  const direction = useStore((s) => s.direction);
  const speed = useStore((s) => s.speed);
  const [draft, setDraft] = useState(dateInputValue(jd));
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!editing) setDraft(dateInputValue(jd));
  }, [jd, editing]);

  const logSpeed = Math.max(-1, Math.min(8.5, Math.log10(Math.max(speed, 1e-9))));

  return (
    <footer id="timeDock" className="glass" aria-label="Contrôle du temps">
      <div className="dock-row">
        <div className="transport">
          <button className={`tbtn${direction < 0 ? ' active' : ''}`} id="btnReverse" title="Inverser le temps" aria-label="Inverser le temps" onClick={reverseTime}>
            <svg viewBox="0 0 24 24">
              <path d="M11 7 5 12l6 5V7Z" />
              <path d="M19 7l-6 5 6 5V7Z" />
            </svg>
          </button>
          <button className="tbtn primary" id="btnPlay" title="Lecture / pause (espace)" aria-label={playing ? 'Mettre en pause' : 'Lancer la simulation'} onClick={togglePlayback}>
            {playing ? (
              <svg id="iconPause" viewBox="0 0 24 24">
                <path d="M8 5v14M16 5v14" />
              </svg>
            ) : (
              <svg id="iconPlay" viewBox="0 0 24 24">
                <path d="M8 5.5v13l10-6.5-10-6.5Z" />
              </svg>
            )}
          </button>
          <button className="tbtn" id="btnNow" title="Revenir à maintenant" aria-label="Revenir à maintenant" onClick={goToNow}>
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="8" />
              <path d="M12 8v4l2.5 2" />
            </svg>
          </button>
        </div>
        <div className="datewrap">
          <label htmlFor="dateInput">Date simulée (UTC) — saisie libre</label>
          <input
            id="dateInput"
            type="datetime-local"
            step="1"
            min="1800-01-01T00:00"
            max="2050-12-31T23:59"
            aria-label="Date et heure simulées en UTC"
            value={draft}
            onFocus={() => setEditing(true)}
            onBlur={() => setEditing(false)}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                applyDateInput(draft);
                setEditing(false);
              }
            }}
            onBlurCapture={() => {
              if (draft !== dateInputValue(clock.jd)) applyDateInput(draft);
            }}
          />
        </div>
        <div className="speedwrap">
          <div className="speed-head">
            <span id="speedLabel">{(direction < 0 ? '−' : '') + fmtSpeedScale(speed)}</span>
            <span id="jdSmall">JD {jd.toFixed(5)}</span>
          </div>
          <input
            id="speedSlider"
            type="range"
            min="-1"
            max="8.5"
            step="0.01"
            value={logSpeed}
            aria-label="Vitesse du temps (échelle logarithmique)"
            onChange={(e) => setSpeed(Math.pow(10, +e.target.value))}
          />
        </div>
      </div>
      <div className="dock-row presets" id="presetRow" role="group" aria-label="Vitesses prédéfinies">
        {PRESETS.map((p) => (
          <button
            key={p.speed}
            className={`preset${Math.abs(p.speed - speed) < speed * 0.0005 ? ' active' : ''}`}
            data-speed={p.speed}
            onClick={() => setSpeed(p.speed)}
          >
            {p.label}
          </button>
        ))}
      </div>
    </footer>
  );
}
