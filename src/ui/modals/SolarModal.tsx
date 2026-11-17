import { useEffect, useRef } from 'react';
import { useStore } from '../../state/store';
import { solarWeather } from '../../services/solarWeather';

/* =====================================================================
   Modale « Météo solaire » — port de legacy-index.html:644-683 et des
   fonctions updateSolarUI / solarScaleChips / solarAlertsUI / drawXrayChart.
   Le composant ne fait que rendre l'instantané zustand ; le service garde
   l'état réseau et la cadence de rafraîchissement.
   ===================================================================== */

const FLARE_COLORS: Record<string, string> = {
  X: '#fb7185',
  M: '#fb923c',
  C: '#fbbf24',
};

function drawXray(cv: HTMLCanvasElement, values: number[]): void {
  const ctx = cv.getContext('2d');
  if (!ctx) return;
  const W = cv.width;
  const H = cv.height;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(2,7,13,0.35)';
  ctx.fillRect(0, 0, W, H);

  if (!values || values.length < 2) {
    ctx.fillStyle = '#61768b';
    ctx.font = '12px "JetBrains Mono", monospace';
    ctx.fillText('Flux X indisponible', 18, H / 2);
    return;
  }

  const yFor = (flux: number): number => {
    const l = Math.log10(Math.max(flux, 1e-9));
    const k = Math.min(1, Math.max(0, (l + 8) / 5));
    return H - 18 - k * (H - 30);
  };

  const levels: Array<[number, string, string]> = [
    [1e-6, 'C', '#fbbf24'],
    [1e-5, 'M', '#fb923c'],
    [1e-4, 'X', '#fb7185'],
  ];
  ctx.font = '9px "JetBrains Mono", monospace';
  for (const [flux, label, color] of levels) {
    const y = yFor(flux);
    ctx.strokeStyle = 'rgba(255,255,255,0.09)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(34, y);
    ctx.lineTo(W - 10, y);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.fillText(label, 8, y + 3);
  }

  ctx.strokeStyle = '#7dd3fc';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  const span = W - 44;
  for (let i = 0; i < values.length; i++) {
    const x = 34 + (i / (values.length - 1)) * span;
    const y = yFor(values[i]);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  ctx.fillStyle = 'rgba(125,211,252,0.08)';
  ctx.lineTo(W - 10, H - 18);
  ctx.lineTo(34, H - 18);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#5f7389';
  ctx.font = '8px "JetBrains Mono", monospace';
  ctx.fillText('-24 h', 34, H - 5);
  ctx.fillText('maintenant', W - 78, H - 5);
}

const SCALE_CLASS: Record<string, string> = { R: 'r', S: 's', G: 'g' };

export function SolarModal() {
  const modal = useStore((s) => s.modal);
  const data = useStore((s) => s.solarData);
  const chart = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (modal !== 'solar' || !chart.current) return;
    drawXray(chart.current, data.xray);
  }, [modal, data.xray]);

  useEffect(() => {
    if (modal !== 'solar') return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') useStore.getState().setModal(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modal]);

  if (modal !== 'solar') return null;

  const close = (): void => useStore.getState().setModal(null);
  const badgeClass = data.badgeClass === 'ok' ? 'live' : data.badgeClass;
  const flareLetter = data.flare.trim().charAt(0).toUpperCase();
  const flareColor = FLARE_COLORS[flareLetter] ?? '#dce9f7';

  return (
    <div
      id="solarModal"
      className="modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="solarTitle"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="modal-card glass solar-card">
        <button id="btnCloseSolar" className="icon-btn modal-close" onClick={close} aria-label="Fermer">
          ✕
        </button>
        <h2 id="solarTitle">Météo solaire</h2>
        <div className="solar-top">
          <span id="solarBadge" className={'weather-badge ' + badgeClass}>
            {data.badge}
          </span>
          <span id="solarIssued" className="solar-issued">
            {data.issued}
          </span>
        </div>
        <div className="solar-grid">
          <div className="solar-col">
            <div className="sdo-frame">
              <img
                id="sdoImage"
                src={data.imageUrl || undefined}
                className={data.imageLoading ? undefined : 'loaded'}
                alt="Image NASA SDO du Soleil"
                referrerPolicy="no-referrer"
              />
              <div id="sdoLoading" className={'sdo-loading' + (data.imageLoading ? '' : ' hidden')}>
                Chargement de l’image SDO…
              </div>
            </div>
            <div id="waveTabs" className="wave-tabs" role="group" aria-label="Longueur d'onde SDO">
              {(
                [
                  ['0193', '193 Å'],
                  ['0304', '304 Å'],
                  ['HMIIC', 'Visible'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  data-wave={key}
                  className={data.wave === key ? 'active' : undefined}
                  onClick={() => solarWeather.setWave(key)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div id="sdoNote" className="note">
              {data.note}
            </div>
          </div>
          <div className="solar-col">
            <div className="solar-flare-line">
              <span>Dernière éruption</span>
              <b id="solarFlare" style={{ color: flareColor }}>
                {data.flare}
              </b>
            </div>
            <div id="solarLegend" className="solar-legend" dangerouslySetInnerHTML={{ __html: data.legend }} />
            <canvas ref={chart} id="xrayChart" width={640} height={150} aria-label="Flux X 24 heures" />
            <div className="solar-stats">
              <div>
                <span>Prob. M</span>
                <b id="solarProbM">{data.probM}</b>
              </div>
              <div>
                <span>Prob. X</span>
                <b id="solarProbX">{data.probX}</b>
              </div>
              <div>
                <span>Vent solaire</span>
                <b id="solarWind">{data.wind}</b>
              </div>
              <div>
                <span>Densité</span>
                <b id="solarDensity">{data.density}</b>
              </div>
              <div>
                <span>Bz</span>
                <b id="solarBz">{data.bz}</b>
              </div>
              <div>
                <span>Kp</span>
                <b id="solarKp">{data.kp}</b>
              </div>
            </div>
            <div id="solarScales" className="scale-chips">
              {data.scales.length === 0 ? (
                <span className="scale-chip">R/S/G —</span>
              ) : (
                data.scales.map((chip) => {
                  const [value, ...rest] = chip.value.split(' ');
                  return (
                    <span key={chip.label} className={'scale-chip ' + (SCALE_CLASS[chip.label] ?? '')}>
                      {chip.label}
                      <b>{value}</b>
                      {rest.length ? ' ' + rest.join(' ') : ''}
                    </span>
                  );
                })
              )}
            </div>
            <div id="solarAlerts" className="alert-list">
              {data.alerts.length === 0 ? (
                <div className="alert-item">Aucune alerte NOAA récente.</div>
              ) : (
                data.alerts.map((a, i) => (
                  <div key={a.title + i} className="alert-item">
                    <b>{a.title}</b>
                    <span>{a.lines.join(' · ')}</span>
                  </div>
                ))
              )}
            </div>
            <details className="forecast">
              <summary>Prévision 3 jours (NOAA)</summary>
              <pre id="solarForecast">{data.forecast}</pre>
            </details>
          </div>
        </div>
        <div className="solar-credits">
          NASA SDO (panneau 2D) · NOAA SWPC · l’activité de la sphère 3D est procédurale et pilotée
          par les données NOAA ; texture WebGL SDO bloquée par CORS.
        </div>
      </div>
    </div>
  );
}
