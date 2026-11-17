import * as THREE from 'three';
import { dateToJD } from '../astro/kepler';
import { clock } from '../state/clock';
import { useStore } from '../state/store';
import type { BadgeClass } from '../state/store';

/* =====================================================================
   Météo solaire : NOAA SWPC (10 flux) + images NASA SDO (panneau 2D).
   Port de legacy-index.html:4846-5650. Objet mutable hors React : la
   boucle écrit les champs, les composants 3D les lisent chaque image ;
   l'interface reçoit des instantanés throttlés via le store zustand.
   ===================================================================== */

const SWPC = 'https://services.swpc.noaa.gov';
const SDO_BASE = 'https://sdo.gsfc.nasa.gov/assets/img/latest/';
const SDO_FILES: Record<string, string> = {
  '0193': 'latest_2048_0193.jpg',
  '0304': 'latest_2048_0304.jpg',
  HMIIC: 'latest_2048_HMIIC.jpg',
};
const SOLAR_REFRESH_MS = 12 * 60 * 1000;
const LIVE_WINDOW_H = 3;
const FETCH_TIMEOUT_MS = 20000;
const UI_INTERVAL_MS = 1000;
const INPUT_INTERVAL_MS = 400;

/* Bornes Ovation : grille fournie en longitude 0..359 / latitude -90..90. */
const OVATION_W = 360;
const OVATION_H = 181;

function clamp(x: number, a: number, b: number): number {
  return x < a ? a : x > b ? b : x;
}

/* Fenêtre « direct » : la date simulée doit rester à ±3 h de maintenant. */
function isLiveDate(): boolean {
  const nowJD = dateToJD(new Date());
  return Math.abs((clock.jd - nowJD) * 24) <= LIVE_WINDOW_H;
}

function fetchJSON(url: string, timeoutMs: number): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  return fetch(url, { signal: ctrl.signal, cache: 'no-store' })
    .then((r) => {
      if (!r.ok) {
        return r.text().then((t) => {
          throw new Error('HTTP ' + r.status + ' ' + t.slice(0, 90));
        });
      }
      return r.json() as Promise<unknown>;
    })
    .finally(() => clearTimeout(timer));
}

function fetchText(url: string, timeoutMs: number): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  return fetch(url, { signal: ctrl.signal, cache: 'no-store' })
    .then((r) => {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.text();
    })
    .finally(() => clearTimeout(timer));
}

/* ------------------------------ Données ------------------------------ */

interface FlareRaw {
  max_class?: string;
  current_class?: string;
  begin_time?: string;
  max_time?: string;
  time_tag?: string;
  end_time?: string;
}

interface XrayRaw {
  energy?: string;
  flux?: string | number;
  time_tag?: string;
}

interface ProbRaw {
  m_class_1_day?: string | number;
  x_class_1_day?: string | number;
  c_class_1_day?: string | number;
  date?: string;
}

interface KpRaw {
  Kp?: number;
  time_tag?: string;
}

interface ScaleRaw {
  Scale?: number | string | null;
  Text?: string | null;
  MinorProb?: number;
  Prob?: number;
}

interface ScalesRaw {
  DateStamp?: string;
  TimeStamp?: string;
  R?: ScaleRaw;
  S?: ScaleRaw;
  G?: ScaleRaw;
}

interface WindRaw {
  active?: boolean;
  proton_speed?: number | null;
  proton_density?: number | null;
  time_tag?: string;
}

interface MagRaw {
  active?: boolean;
  bz_gsm?: number | null;
  bt?: number | null;
  time_tag?: string;
}

interface AlertRaw {
  product_id?: string;
  issue_datetime?: string;
  message?: string;
}

interface OvationRaw {
  'Observation Time'?: string;
  coordinates?: Array<[number, number, number]>;
}

interface FlareData {
  cls: string;
  begin: string;
  peak: string;
  end: string;
  current: string;
  letter: string;
  score: number;
  peakMs: number;
}

interface XrayData {
  flux: number;
  time: string;
  series: Array<{ time: string; flux: number }>;
  samples: number[];
}

interface ProbData {
  m: number;
  x: number;
  c: number;
  date: string;
}

interface KpData {
  value: number;
  time: string;
}

interface ScaleEntry {
  scale: number | string | null;
  text: string;
}

interface ScalesData {
  R?: ScaleEntry;
  S?: ScaleEntry;
  G?: ScaleEntry;
  date: string;
  time: string;
}

interface WindData {
  speed: number;
  density: number;
  time: string;
}

interface MagData {
  bz: number;
  bt: number;
  time: string;
}

interface SolarData {
  flare?: FlareData;
  xray?: XrayData;
  prob?: ProbData;
  kp?: KpData;
  scales?: ScalesData;
  wind?: WindData;
  mag?: MagData;
  alerts?: AlertRaw[];
  ovation?: { time: string; max: number };
  forecast?: string;
}

/* --------------------------- État interne --------------------------- */

let data: SolarData = {};
let errors: Record<string, string> = {};
let dataOk = 0;
let loading = false;
let lastFetch = 0;
let lastSdo = 0;
let token = 0;
let sdoSeq = 0;
let wave = '0193';
let sdoState: 'loading' | 'ok' | 'error' = 'loading';
let sdoUrl = '';
let flareLevel = 0;
let flareActive = false;
let ovationMax = 0;
let uiKey = '';
let live = false;
let initialized = false;
let lastUiCheck = 0;
let lastInputsCheck = 0;
let liveCheck = 0;

/* Entrées lissées : recalculées à 2,5 Hz, jamais allouées par image. */
const inputs = {
  fx: false,
  flux: 0,
  probM: 0,
  probX: 0,
  targetFlare: 0,
  kp: 0,
  magOn: false,
};

/* ------------------------ Classe d'éruption ------------------------- */

function parseFlareClass(cls: string): { letter: string; value: number; score: number } {
  const m = /^([ABCMX])(\d+(?:\.\d+)?)/.exec(String(cls || '').toUpperCase());
  if (!m) return { letter: '', value: 0, score: 0 };
  const base: Record<string, number> = { A: 1, B: 2, C: 3, M: 4, X: 5 };
  return { letter: m[1], value: parseFloat(m[2]), score: base[m[1]] * 10 + parseFloat(m[2]) };
}

function flareLevelFromClass(cls: string): number {
  const f = parseFlareClass(cls);
  if (!f.letter) return 0;
  if (f.letter === 'A' || f.letter === 'B' || f.letter === 'C') return 0;
  return clamp(0.28 + f.score * 0.026, 0.25, 1);
}

/* -------------------------- Ovation -------------------------------- */

function buildAuroraTexture(ovation: OvationRaw | null): THREE.DataTexture | null {
  const coords = ovation && ovation.coordinates;
  if (!Array.isArray(coords)) return null;
  const data8 = new Uint8Array(OVATION_W * OVATION_H * 4);
  let max = 0;
  for (let i = 0; i < coords.length; i++) {
    const c = coords[i];
    if (!c || c.length < 3) continue;
    const lon = Math.round(c[0]);
    const lat = Math.round(c[1]);
    const val = Number(c[2]);
    if (lon < 0 || lon >= OVATION_W || lat < -90 || lat > 90 || !Number.isFinite(val)) continue;
    const x = lon;
    const y = 90 - lat;
    const v = clamp(Math.round(val * 2.55), 0, 255);
    const k = (y * OVATION_W + x) * 4;
    data8[k] = v;
    data8[k + 1] = v;
    data8[k + 2] = v;
    data8[k + 3] = 255;
    if (val > max) max = val;
  }
  const tex = new THREE.DataTexture(data8, OVATION_W, OVATION_H, THREE.RGBAFormat);
  tex.colorSpace = THREE.NoColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  ovationMax = max;
  return tex;
}

function setOvationTexture(tex: THREE.DataTexture): void {
  const old = solarWeather.auroraTexture;
  solarWeather.auroraTexture = tex;
  solarWeather.useOvation = 1;
  if (old && old !== tex) {
    try {
      old.dispose();
    } catch {
      /* ignore */
    }
  }
}

/* --------------------------- Parsing ------------------------------- */

function asArray(v: unknown): unknown[] | null {
  return Array.isArray(v) ? v : null;
}

function parseSolarData(results: Record<string, PromiseSettledResult<unknown>>): void {
  const out: SolarData = {};
  const errs: Record<string, string> = {};
  const get = (key: string): unknown => {
    const r = results[key];
    return r && r.status === 'fulfilled' ? r.value : null;
  };
  const fail = (key: string): void => {
    const r = results[key];
    if (r && r.status === 'rejected') {
      const reason = r.reason as { message?: string } | undefined;
      errs[key] = String(reason?.message ?? reason);
    }
  };
  ['flares', 'xrays', 'probs', 'kp', 'scales', 'wind', 'mag', 'alerts', 'ovation'].forEach(fail);
  if (results.forecast && results.forecast.status === 'rejected') {
    const reason = results.forecast.reason as { message?: string } | undefined;
    errs.forecast = String(reason ?? '');
  }

  try {
    const flares = asArray(get('flares')) as FlareRaw[] | null;
    if (flares && flares.length) {
      const f = flares[0];
      const cls = f.max_class || f.current_class || '—';
      const peak = f.max_time || f.time_tag || '';
      const parsed = parseFlareClass(cls);
      out.flare = {
        cls,
        begin: f.begin_time || '',
        peak,
        end: f.end_time || '',
        current: f.current_class || '',
        letter: parsed.letter,
        score: parsed.score,
        peakMs: peak ? Date.parse(peak) : NaN,
      };
    }
  } catch (e) {
    errs.flares = (e as Error).message;
  }

  try {
    const xr = asArray(get('xrays')) as XrayRaw[] | null;
    if (xr) {
      const series = xr
        .filter((x) => x && x.energy === '0.1-0.8nm' && Number.isFinite(Number(x.flux)))
        .map((x) => ({ time: String(x.time_tag ?? ''), flux: Number(x.flux) }));
      if (series.length) {
        const last = series[series.length - 1];
        /* Échantillonnage borné (≤ 360 points) : même allure, instantané léger. */
        const stride = Math.max(1, Math.ceil(series.length / 360));
        const samples: number[] = [];
        for (let i = 0; i < series.length; i += stride) samples.push(series[i].flux);
        if (samples[samples.length - 1] !== last.flux) samples.push(last.flux);
        out.xray = { flux: last.flux, time: last.time, series, samples };
      }
    }
  } catch (e) {
    errs.xrays = (e as Error).message;
  }

  try {
    const probs = asArray(get('probs')) as ProbRaw[] | null;
    if (probs && probs.length) {
      const p = probs[0];
      out.prob = {
        m: Number(p.m_class_1_day),
        x: Number(p.x_class_1_day),
        c: Number(p.c_class_1_day),
        date: String(p.date ?? ''),
      };
    }
  } catch (e) {
    errs.probs = (e as Error).message;
  }

  try {
    const kp = asArray(get('kp')) as KpRaw[] | null;
    if (kp && kp.length) {
      const k = kp[kp.length - 1];
      out.kp = { value: Number(k.Kp), time: String(k.time_tag ?? '') };
    }
  } catch (e) {
    errs.kp = (e as Error).message;
  }

  try {
    /* Réponse indexée par jour : "0" = aujourd'hui, "1".."3" = prévisions. */
    const raw = get('scales') as Record<string, ScalesRaw> | null;
    const day = raw ? raw['0'] : undefined;
    if (day) {
      const entry = (s: ScaleRaw | undefined): ScaleEntry | undefined =>
        s ? { scale: s.Scale != null ? s.Scale : null, text: String(s.Text ?? '') } : undefined;
      out.scales = {
        R: entry(day.R),
        S: entry(day.S),
        G: entry(day.G),
        date: String(day.DateStamp ?? ''),
        time: String(day.TimeStamp ?? ''),
      };
    }
  } catch (e) {
    errs.scales = (e as Error).message;
  }

  try {
    const w = asArray(get('wind')) as WindRaw[] | null;
    if (w && w.length) {
      const p =
        w.find((x) => x && x.active && x.proton_speed != null) ||
        w.find((x) => x && x.proton_speed != null);
      if (p) {
        out.wind = {
          speed: Number(p.proton_speed),
          density: Number(p.proton_density),
          time: String(p.time_tag ?? ''),
        };
      }
    }
  } catch (e) {
    errs.wind = (e as Error).message;
  }

  try {
    const m = asArray(get('mag')) as MagRaw[] | null;
    if (m && m.length) {
      const p =
        m.find((x) => x && x.active && x.bz_gsm != null) ||
        m.find((x) => x && x.bz_gsm != null);
      if (p) {
        out.mag = { bz: Number(p.bz_gsm), bt: Number(p.bt), time: String(p.time_tag ?? '') };
      }
    }
  } catch (e) {
    errs.mag = (e as Error).message;
  }

  try {
    const alerts = asArray(get('alerts')) as AlertRaw[] | null;
    if (alerts) {
      const cutoff = Date.now() - 24 * 3600 * 1000;
      const recent = alerts.filter((a) => {
        const t = Date.parse(String(a.issue_datetime || '').replace(' ', 'T') + 'Z');
        return Number.isFinite(t) && t >= cutoff;
      });
      out.alerts = (recent.length ? recent : alerts).slice(0, 4);
    }
  } catch (e) {
    errs.alerts = (e as Error).message;
  }

  try {
    const ov = get('ovation') as OvationRaw | null;
    if (ov && Array.isArray(ov.coordinates)) {
      const tex = buildAuroraTexture(ov);
      if (tex) {
        setOvationTexture(tex);
        out.ovation = { time: String(ov['Observation Time'] ?? ''), max: ovationMax };
      }
    }
  } catch (e) {
    errs.ovation = (e as Error).message;
  }

  try {
    const txt = get('forecast');
    if (typeof txt === 'string') out.forecast = txt;
  } catch (e) {
    errs.forecast = (e as Error).message;
  }

  data = out;
  errors = errs;
  const core = ['flare', 'xray', 'prob', 'kp', 'scales', 'wind', 'mag', 'alerts', 'ovation'];
  dataOk = core.filter((k) => !!(out as Record<string, unknown>)[k]).length;
}

/* ------------------------- Rafraîchissement ------------------------ */

async function refreshSolarWeather(): Promise<void> {
  if (!solarWeather.enabled || loading) return;
  const myToken = ++token;
  loading = true;
  if (!dataOk) publish(true);
  const endpoints: Record<string, string> = {
    flares: SWPC + '/json/goes/primary/xray-flares-latest.json',
    xrays: SWPC + '/json/goes/primary/xrays-1-day.json',
    probs: SWPC + '/json/solar_probabilities.json',
    kp: SWPC + '/products/noaa-planetary-k-index.json',
    scales: SWPC + '/products/noaa-scales.json',
    wind: SWPC + '/json/rtsw/rtsw_wind_1m.json',
    mag: SWPC + '/json/rtsw/rtsw_mag_1m.json',
    alerts: SWPC + '/products/alerts.json',
    ovation: SWPC + '/json/ovation_aurora_latest.json',
    forecast: SWPC + '/text/3-day-forecast.txt',
  };
  try {
    const keys = Object.keys(endpoints);
    const jobs = keys.map((k) =>
      k === 'forecast'
        ? fetchText(endpoints[k], FETCH_TIMEOUT_MS)
        : fetchJSON(endpoints[k], FETCH_TIMEOUT_MS),
    );
    const settled = await Promise.allSettled(jobs);
    if (myToken !== token) return;
    const results: Record<string, PromiseSettledResult<unknown>> = {};
    keys.forEach((k, i) => {
      results[k] = settled[i];
    });
    try {
      parseSolarData(results);
    } catch (e) {
      console.warn('[météo solaire] parsing partiel : ' + ((e as Error).message || String(e)));
    }
  } catch (e) {
    errors.net = (e as Error).message;
  } finally {
    if (myToken === token) {
      loading = false;
      lastFetch = Date.now();
      live = isLiveDate();
      publish(true);
      const failed = Object.keys(errors);
      if (failed.length) console.warn('[météo solaire] sources en échec : ' + failed.join(', '));
    }
  }
}

/* --------------------------- Image SDO ---------------------------- */

function loadSdo(bust: boolean): void {
  if (!SDO_FILES[wave]) wave = '0193';
  const seq = ++sdoSeq;
  const url = SDO_BASE + SDO_FILES[wave] + (bust ? '?t=' + Date.now() : '');
  sdoUrl = url;
  sdoState = 'loading';
  lastSdo = Date.now();
  publish(true);
  let img: HTMLImageElement;
  try {
    img = new Image();
  } catch {
    sdoState = 'error';
    publish(true);
    return;
  }
  img.referrerPolicy = 'no-referrer';
  img.onload = () => {
    if (seq !== sdoSeq) return;
    sdoState = 'ok';
    publish(true);
  };
  img.onerror = () => {
    if (seq !== sdoSeq) return;
    sdoState = 'error';
    publish(true);
  };
  img.src = url;
}

function applyWave(next: string): void {
  if (!SDO_FILES[next]) next = '0193';
  wave = next;
  loadSdo(false);
}

/* --------------------------- Interface ---------------------------- */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function alertItems(): Array<{ title: string; lines: string[] }> {
  const alerts = data.alerts;
  if (!alerts || !alerts.length) return [];
  return alerts.slice(0, 3).map((a) => {
    const title = String(a.product_id || 'ALERTE') + ' · ' + String(a.issue_datetime || '').slice(0, 16);
    const lines = String(a.message || '')
      .replace(/\r/g, '')
      .split('\n')
      .map((x) => x.trim())
      .filter(Boolean);
    const keyLine =
      lines.find((x) => /^(ALERT|WARNING|EXTENDED WARNING|WATCH|SUMMARY):/i.test(x)) ||
      lines.find((x) => /NOAA Scale:/i.test(x)) ||
      lines[1] ||
      lines[0] ||
      '';
    const scaleLine = lines.find((x) => /NOAA Scale:/i.test(x) && x !== keyLine) || '';
    const out = [keyLine];
    if (scaleLine) out.push(scaleLine);
    return { title, lines: out.filter(Boolean) };
  });
}

function scaleChips(): Array<{ label: string; value: string }> {
  const s = data.scales;
  if (!s) return [];
  const chips: Array<{ label: string; value: string }> = [];
  const add = (label: string, obj: ScaleEntry | undefined): void => {
    if (!obj) return;
    const val = obj.scale != null ? String(obj.scale) : '—';
    chips.push({ label, value: obj.text ? val + ' ' + obj.text : val });
  };
  add('R', s.R);
  add('S', s.S);
  add('G', s.G);
  return chips;
}

function publish(force: boolean): void {
  const s = useStore.getState();
  const enabled = solarWeather.enabled;
  const liveNow = live;
  let badge: string;
  let badgeClass: BadgeClass;
  if (!enabled) {
    badge = 'Désactivée';
    badgeClass = 'off';
  } else if (loading && !dataOk) {
    badge = 'Chargement…';
    badgeClass = 'warn';
  } else if (!liveNow) {
    badge = 'Hors date — simulé';
    badgeClass = 'warn';
  } else if (!dataOk) {
    badge = 'NOAA indisponible';
    badgeClass = 'err';
  } else {
    badge = 'EN DIRECT';
    badgeClass = 'ok';
  }

  const kpText = data.kp && Number.isFinite(data.kp.value) ? data.kp.value.toFixed(1) : '—';
  const windText = data.wind ? Math.round(data.wind.speed) + ' km/s' : '—';
  const flareCls = data.flare ? data.flare.cls : '—';
  const compact = 'Kp ' + kpText + ' · vent ' + windText + ' · ' + flareCls;

  const issuedTime = data.scales
    ? (data.scales.date + ' ' + data.scales.time + ' UTC').trim()
    : data.xray && data.xray.time
      ? data.xray.time + ' UTC'
      : '';
  const issued = issuedTime ? 'NOAA SWPC · ' + issuedTime : 'NOAA SWPC';

  const key = [
    enabled,
    liveNow,
    loading,
    dataOk,
    wave,
    flareCls,
    data.flare && data.flare.peak,
    data.xray && data.xray.time,
    data.prob && data.prob.m,
    data.kp && data.kp.value,
    data.wind && data.wind.speed,
    data.mag && data.mag.bz,
    data.scales && data.scales.R && data.scales.R.scale,
    data.scales && data.scales.S && data.scales.S.scale,
    data.scales && data.scales.G && data.scales.G.scale,
    data.forecast && data.forecast.length,
    data.ovation && data.ovation.time,
    sdoState,
    badge,
  ].join('|');
  if (!force && key === uiKey) return;
  uiKey = key;

  let legend: string;
  if (liveNow && data.flare) {
    legend =
      'Dernière éruption <strong>' +
      escapeHtml(data.flare.cls) +
      '</strong> à ' +
      escapeHtml((data.flare.peak || '').replace('T', ' ').slice(11, 16)) +
      ' UTC' +
      (flareActive ? ' · effet actif' : ' · activité de fond');
  } else if (!liveNow) {
    legend =
      'Date simulée hors du direct : effets solaires réels désactivés, activité de fond simulée.';
  } else {
    legend = 'Flux et activité NOAA en cours de chargement.';
  }

  const baseNote =
    'Image NASA SDO la plus récente · panneau 2D. La texture WebGL SDO est bloquée par l’absence de CORS ; la sphère 3D reste procédurale.' +
    (liveNow ? '' : ' Hors date simulée : image live non datée, effets réels désactivés.');
  const note =
    sdoState === 'error'
      ? 'Image SDO 2D indisponible ; la sphère 3D procédurale reste pilotée par NOAA.'
      : baseNote;

  const flareText = data.flare
    ? data.flare.cls +
      ' · ' +
      (data.flare.peak || '').replace('T', ' ').slice(0, 16) +
      ' UTC'
    : '—';

  s.setSolarData({
    badge,
    badgeClass,
    issued,
    compactText: compact,
    wave,
    imageUrl: sdoUrl,
    imageLoading: sdoState === 'loading',
    note,
    flare: flareText,
    legend,
    probM: data.prob ? String(data.prob.m) + ' %' : '—',
    probX: data.prob ? String(data.prob.x) + ' %' : '—',
    wind: data.wind ? Math.round(data.wind.speed) + ' km/s' : '—',
    density:
      data.wind && Number.isFinite(data.wind.density)
        ? data.wind.density.toFixed(1) + ' p/cm³'
        : '—',
    bz: data.mag ? data.mag.bz.toFixed(1) + ' nT' : '—',
    kp: data.kp ? data.kp.value.toFixed(2) : '—',
    scales: scaleChips(),
    alerts: alertItems(),
    forecast: data.forecast || 'Prévision indisponible.',
    xray: data.xray ? data.xray.samples : [],
    live: liveNow,
  });
  s.setSolar({ badge, badgeClass, source: 'NOAA SWPC', body: compact });
}

/* --------------------------- Objet public -------------------------- */

export const solarWeather = {
  activity: 0,
  sunspots: 0,
  flare: 0,
  flareUv: { x: 0.6, y: 0.5 },
  waveTint: [1, 1, 1] as [number, number, number],
  auroraTexture: null as THREE.Texture | null,
  useOvation: 0,
  kp: 0,
  auroraIntensity: 0,
  magOpacity: 0,
  enabled: true,

  setEnabled(on: boolean): void {
    const next = !!on;
    solarWeather.enabled = next;
    const store = useStore.getState();
    if (store.layers.solarWeather !== next) store.setLayer('solarWeather', next);
    if (!next) {
      solarWeather.activity = 0;
      solarWeather.sunspots = 0;
      solarWeather.flare = 0;
      solarWeather.auroraIntensity = 0;
      solarWeather.magOpacity = 0;
      flareLevel = 0;
    } else {
      lastFetch = 0;
      void refreshSolarWeather();
    }
    publish(true);
  },

  setWave(next: string): void {
    applyWave(next);
  },

  tick(dt: number, now: number): void {
    if (!initialized) {
      initialized = true;
      solarWeather.enabled = useStore.getState().layers.solarWeather;
      loadSdo(false);
      if (solarWeather.enabled) void refreshSolarWeather();
      live = isLiveDate();
      liveCheck = now;
      publish(true);
    }

    /* Miroir de l'interrupteur de couche : le store reste la source de vérité. */
    const layerOn = useStore.getState().layers.solarWeather;
    if (layerOn !== solarWeather.enabled) solarWeather.setEnabled(layerOn);

    const nowMs = Date.now();
    if (now - liveCheck > 500) {
      liveCheck = now;
      const nextLive = isLiveDate();
      if (nextLive !== live) {
        live = nextLive;
        publish(true);
      }
    }

    if (now - lastUiCheck > UI_INTERVAL_MS) {
      lastUiCheck = now;
      if (solarWeather.enabled && !loading && nowMs - lastFetch > SOLAR_REFRESH_MS) {
        void refreshSolarWeather();
      }
      if (solarWeather.enabled && !loading && lastSdo && nowMs - lastSdo > SOLAR_REFRESH_MS) {
        loadSdo(true);
      }
      publish(false);
    }

    if (now - lastInputsCheck > INPUT_INTERVAL_MS) {
      lastInputsCheck = now;
      const fx = solarWeather.enabled && live && dataOk > 0;
      inputs.fx = fx;
      inputs.flux = data.xray ? data.xray.flux : 0;
      inputs.probM = data.prob ? data.prob.m : 0;
      inputs.probX = data.prob ? data.prob.x : 0;
      inputs.kp = data.kp && Number.isFinite(data.kp.value) ? data.kp.value : 0;
      inputs.magOn = !!(data.kp || data.scales);

      let recentFlare = false;
      if (fx && data.flare) {
        const f = data.flare;
        const hours = (Date.now() - f.peakMs) / 3600000;
        recentFlare = (f.letter === 'M' || f.letter === 'X') && hours >= 0 && hours < 2;
      }
      flareActive = recentFlare;
      inputs.targetFlare = recentFlare && data.flare ? flareLevelFromClass(data.flare.cls) : 0;
    }

    const step = Math.min(1, Math.max(dt, 0) * 4);
    flareLevel += (inputs.targetFlare - flareLevel) * step;

    const flux = inputs.flux;
    const activity =
      inputs.fx && flux > 0
        ? clamp((Math.log10(Math.max(flux, 1e-9)) + 7) / 3, 0, 1)
        : 0;
    const spots =
      inputs.fx && data.prob
        ? clamp((inputs.probM / 100) * 0.35 + (inputs.probX / 100) * 0.65, 0, 0.85)
        : 0;
    const kp = inputs.kp;

    solarWeather.activity = activity;
    solarWeather.sunspots = spots;
    solarWeather.flare = flareLevel * (0.82 + 0.18 * Math.sin(clock.timeElapsed * 3.2));
    solarWeather.flareUv.x = 0.62;
    solarWeather.flareUv.y = 0.43;
    /* La longueur d'onde SDO colore le panneau 2D ; la sphère 3D reste procédurale. */
    solarWeather.waveTint[0] = 1;
    solarWeather.waveTint[1] = 1;
    solarWeather.waveTint[2] = 1;
    solarWeather.kp = kp;
    solarWeather.auroraIntensity =
      inputs.fx && kp > 1 ? 0.9 + 0.35 * Math.min(1, kp / 9) : 0;
    solarWeather.magOpacity =
      inputs.fx && inputs.magOn ? 0.008 + 0.018 * Math.min(1, kp / 9) : 0;
  },
};

/* Le tick est appelé par EphemerisDriver dès la première image ; rien à lancer ici. */
