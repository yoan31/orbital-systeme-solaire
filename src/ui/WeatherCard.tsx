import type { CSSProperties } from 'react';
import { useStore } from '../state/store';

const MAP_STYLE: CSSProperties = {
  display: 'block',
  width: '100%',
  marginTop: '7px',
  borderRadius: '6px',
  border: '1px solid var(--border2)',
};

/* Carte météo Terre : miroir de `#weatherCard` de l'ancienne UI, alimentée par
   l'instantané poussé par `services/earthWeather`. Comme la version d'origine,
   elle n'existe que lorsque la Terre est l'astre sélectionné. */
export function WeatherCard() {
  const selected = useStore((s) => s.selected);
  const card = useStore((s) => s.weatherCard);

  if (selected !== 'earth') return null;

  /* BadgeClass ne distingue pas direct/archive : l'archive est reconnaissable
     à sa mosaïque GIBS, comme dans les classes CSS d'origine. */
  const tone = card.badgeClass === 'ok' ? (card.mapLabel ? 'archive' : 'live') : card.badgeClass;

  return (
    <div id="weatherCard" className="weather-card" aria-live="polite">
      <div className="weather-head">
        <span className="weather-title">Météo Terre</span>
        <span id="earthWeatherBadge" className={`weather-badge ${tone}`}>
          {card.badge || '—'}
        </span>
      </div>
      <div id="earthWeatherSource" className="weather-source">
        {card.source}
      </div>
      <div id="earthWeatherBody" className="weather-body">
        {card.pointLabel ? <div className="weather-coords">{card.pointLabel}</div> : null}
        {card.rows.length > 0 ? (
          <div className="stats">
            {card.rows.map((row, i) => (
              <div className="stat" key={`${row.label}-${i}`}>
                <span>{row.label}</span>
                <b>{row.value}</b>
                {row.sub ? <small>{row.sub}</small> : null}
              </div>
            ))}
          </div>
        ) : null}
        {card.mapUrl ? (
          <>
            <img src={card.mapUrl} alt={card.mapLabel || 'Mosaïque satellite NASA GIBS'} style={MAP_STYLE} />
            {card.mapLabel ? <div className="note">{card.mapLabel}</div> : null}
          </>
        ) : null}
        {card.point.length > 0 ? (
          <div className="weather-point-grid">
            {card.point.map((row, i) => (
              <div key={`${row.label}-${i}`}>
                <span>{row.label}</span>
                <b>{row.value}</b>
              </div>
            ))}
          </div>
        ) : null}
        {card.note ? <div className={card.point.length > 0 ? 'note' : 'w-empty'}>{card.note}</div> : null}
      </div>
      <div className="weather-credit">NASA GIBS · Open-Meteo</div>
    </div>
  );
}
