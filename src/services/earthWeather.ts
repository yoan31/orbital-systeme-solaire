import * as THREE from 'three';
import { dateToJD, jdToDateParts } from '../astro/kepler';
import { vector3ToLatLon } from '../astro/earth';
import { clock } from '../state/clock';
import { useStore } from '../state/store';
import type { BadgeClass, WeatherRow, WeatherSnapshot } from '../state/store';
import { configureTexture } from '../textures/loader';
import { pad2 } from '../lib/format';

/* Météo réelle de la Terre : nébulosité Open-Meteo (overlay DataTexture) et
   archives NASA GIBS (mosaïque MODIS). Aucune de ces requêtes n'est critique :
   tout échec réseau retombe silencieusement sur les nuages procéduraux. */

const WEATHER_LIVE_WINDOW_H = 3;
const WEATHER_REFRESH_MS = 12 * 60 * 1000;
const LIVE_RETRY_MS = 120000;
const ARCHIVE_REFRESH_MS = 600000;
const ARCHIVE_DEBOUNCE_MS = 450;

const GIBS_Z = 2;
const GIBS_COLS = 5;
const GIBS_ROWS = 3;
const GIBS_TILE = 512;
const GIBS_CROP_Y = 128;
const GIBS_CROP_H = 1280;
const GIBS_TILE_TIMEOUT = 15000;

const OM_STEP = 10;
const OM_BATCH = 84;
const OM_CONCURRENCY = 3;
const OM_TIMEOUT = 18000;
const OM_MIN_RATIO = 0.5;

const POINT_TIMEOUT = 14000;
const POINT_CACHE_MS = 600000;
const POINT_RETRY_DELAY = 2400;

const LIVE_W = 1024;
const LIVE_H = 512;
const ARCHIVE_W = 2048;
const ARCHIVE_H = 1024;

const NF1 = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const NF2 = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const NF_INT = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

type Mode = 'idle' | 'live' | 'archive' | 'off' | 'future' | 'unavailable';
type LegacyTone = 'live' | 'archive' | 'warn' | 'off' | 'err';

interface LatLonPoint {
  lat: number;
  lon: number;
}

interface PointData {
  temp: number;
  wind: number;
  pressure: number;
  cloud: number;
  time: string;
}

interface OmGridEntry {
  latitude?: number;
  longitude?: number;
  current?: { time?: string; cloud_cover?: number };
}

interface OmPointEntry {
  current?: {
    time?: string;
    temperature_2m?: number;
    wind_speed_10m?: number;
    surface_pressure?: number;
    cloud_cover?: number;
  };
}

interface GibsTile {
  row: number;
  col: number;
  url: string;
}

interface GibsResult {
  pixels: Uint8Array;
  mapUrl: string;
  coverage: number;
  tiles: number;
}

const OM_LATS: number[] = [];
const OM_LONS: number[] = [];
for (let la = 80; la >= -80; la -= OM_STEP) OM_LATS.push(la);
for (let lo = -180; lo < 180; lo += OM_STEP) OM_LONS.push(lo);
const OM_NX = OM_LONS.length;
const OM_NY = OM_LATS.length;

const internal = {
  mode: 'idle' as Mode,
  key: '',
  pendingKey: '',
  pendingSince: 0,
  loading: false,
  token: 0,
  lastRefresh: 0,
  lastCheck: 0,
  point: null as LatLonPoint | null,
  pointData: null as PointData | null,
  pointCache: null as { key: string; at: number; data: PointData } | null,
  pointLoading: false,
  pointToken: 0,
  badge: 'Chargement…',
  badgeClass: 'off' as BadgeClass,
  source: '',
  error: '',
  livePixels: null as Uint8Array | null,
  liveTime: '',
  archiveKey: '',
  mapUrl: null as string | null,
  mapLabel: '',
  archiveRows: [] as WeatherRow[],
  mapVersion: 0,
  uiKey: '',
};

function weatherClamp(x: number, a: number, b: number): number {
  return x < a ? a : x > b ? b : x;
}

function makeDataTexture(pixels: Uint8Array, width: number, height: number): THREE.CanvasTexture {
  /* CanvasTexture (et non DataTexture) : même chemin d'upload que le moteur
     d'origine. Les pixels sont déjà retournés verticalement (v = 1 = pôle
     nord), donc flipY = false pour ne pas les inverser une seconde fois. */
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2D indisponible');
  const img = ctx.createImageData(width, height);
  img.data.set(pixels);
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.flipY = false;
  configureTexture(tex, { srgb: true, clamp: true }, 1);
  return tex;
}

function disposeTexture(tex: THREE.Texture | null): void {
  if (!tex) return;
  try {
    tex.dispose();
  } catch {
    /* ignore */
  }
}

function swapTexture(tex: THREE.Texture): void {
  const old = earthWeather.texture;
  earthWeather.texture = tex;
  if (old && old !== tex) disposeTexture(old);
}

/* ---- réseau (jamais bloquant) ---- */

async function fetchJSON<T>(url: string, timeoutMs: number): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { signal: ctrl.signal, cache: 'no-store' });
    if (!r.ok) {
      const text = await r.text();
      throw new Error('HTTP ' + r.status + ' ' + text.slice(0, 90));
    }
    return (await r.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

function loadImageURL(url: string, timeoutMs: number): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      img.onload = img.onerror = null;
      img.src = '';
      reject(new Error('délai image dépassé'));
    }, timeoutMs);
    img.onload = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(new Error('image indisponible'));
    };
    img.src = url;
  });
}

async function mapLimit<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<(R | null)[]> {
  const out = new Array<R | null>(items.length).fill(null);
  let next = 0;
  async function worker(): Promise<void> {
    while (next < items.length) {
      const i = next++;
      try {
        out[i] = await fn(items[i]);
      } catch {
        out[i] = null;
      }
    }
  }
  const workers: Promise<void>[] = [];
  for (let i = 0; i < Math.min(limit, items.length); i++) workers.push(worker());
  await Promise.all(workers);
  return out;
}

/* ---- dates ---- */

function weatherDateKey(jd: number): string {
  const p = jdToDateParts(jd);
  return p.year + '-' + pad2(p.month) + '-' + pad2(p.day);
}

function weatherDateLabel(dateKey: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateKey || '');
  return m ? m[3] + '/' + m[2] + '/' + m[1] : '—';
}

function latLonLabel(lat: number, lon: number): string {
  const latTxt = Math.abs(lat).toFixed(2) + '°' + (lat >= 0 ? 'N' : 'S');
  const lonTxt = Math.abs(lon).toFixed(2) + '°' + (lon >= 0 ? 'E' : 'O');
  return latTxt + ' · ' + lonTxt;
}

/* ---- GIBS : 5 × 3 tuiles MODIS -> mosaïque 2048 × 1024 ---- */

function gibsTileURL(layer: string, date: string, row: number, col: number): string {
  return (
    'https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/' +
    layer +
    '/default/' +
    date +
    '/250m/' +
    GIBS_Z +
    '/' +
    row +
    '/' +
    col +
    '.jpeg'
  );
}

function flipPixels(src: Uint8ClampedArray, width: number, height: number): Uint8Array {
  const out = new Uint8Array(src.length);
  const stride = width * 4;
  for (let y = 0; y < height; y++) {
    out.set(src.subarray((height - 1 - y) * stride, (height - y) * stride), y * stride);
  }
  return out;
}

function previousDateKey(dateKey: string): string {
  const d = new Date(dateKey + 'T12:00:00Z');
  if (Number.isNaN(d.getTime())) return dateKey;
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/* La mosaïque journalière MODIS du jour même est incomplète : les fauchées du
   satellite laissent des échardes noires que le shader rendrait en bandes
   sombres sur le globe. On complète donc avec la veille, dessinée derrière
   (destination-over) : seuls les trous du jour sont comblés. */
async function composeGibsArchive(layer: string, dateKey: string): Promise<GibsResult> {
  const tiles: GibsTile[] = [];
  for (let row = 0; row < GIBS_ROWS; row++) {
    for (let col = 0; col < GIBS_COLS; col++) {
      tiles.push({ row, col, url: gibsTileURL(layer, dateKey, row, col) });
    }
  }
  const prevKey = previousDateKey(dateKey);
  const prevTiles: GibsTile[] = tiles.map((t) => ({ row: t.row, col: t.col, url: gibsTileURL(layer, prevKey, t.row, t.col) }));

  const [imgs, prevImgs] = await Promise.all([
    mapLimit(tiles, 5, (t) => loadImageURL(t.url, GIBS_TILE_TIMEOUT)),
    mapLimit(prevTiles, 5, (t) => loadImageURL(t.url, GIBS_TILE_TIMEOUT)),
  ]);
  const drawn = imgs.filter(Boolean).length;
  if (drawn < 4) throw new Error('tuiles GIBS insuffisantes (' + drawn + '/' + tiles.length + ')');

  const stitched = document.createElement('canvas');
  stitched.width = GIBS_COLS * GIBS_TILE;
  stitched.height = GIBS_ROWS * GIBS_TILE;
  const sctx = stitched.getContext('2d', { willReadFrequently: true });
  if (!sctx) throw new Error('canvas 2D indisponible');
  /* Le jour demandé d'abord ; ses trous noirs deviennent transparents, puis la
     veille est dessinée DERRIÈRE (destination-over) pour les combler. */
  sctx.globalCompositeOperation = 'source-over';
  for (let i = 0; i < tiles.length; i++) {
    const img = imgs[i];
    if (img) sctx.drawImage(img, tiles[i].col * GIBS_TILE, tiles[i].row * GIBS_TILE);
  }
  const first = sctx.getImageData(0, 0, stitched.width, stitched.height);
  const fdata = first.data;
  for (let i = 0; i < fdata.length; i += 4) {
    if (fdata[i] <= 2 && fdata[i + 1] <= 2 && fdata[i + 2] <= 2) fdata[i + 3] = 0;
  }
  sctx.putImageData(first, 0, 0);
  sctx.globalCompositeOperation = 'destination-over';
  for (let i = 0; i < prevTiles.length; i++) {
    const img = prevImgs[i];
    if (img) sctx.drawImage(img, prevTiles[i].col * GIBS_TILE, prevTiles[i].row * GIBS_TILE);
  }
  sctx.globalCompositeOperation = 'source-over';

  /* Zones sans donnée MODIS (exactement noires) rendues transparentes : un
     seuil plus large mangeait l'océan profond, qui apparaissait alors en
     bandes de longitude claires sur le globe. */
  const sd = sctx.getImageData(0, 0, stitched.width, stitched.height);
  const d = sd.data;
  const W = stitched.width;
  const SH = stitched.height;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i] <= 2 && d[i + 1] <= 2 && d[i + 2] <= 2) d[i + 3] = 0;
  }
  /* Les tuiles WMTS portent une bordure noire de 1 px et les fauchées
     journalières laissent des échardes : on dilate les pixels opaques vers les
     trous (12 passes, voisinage 4-connexe) pour refermer les liserés sans
     inventer de structures. Les grandes zones polaires restent transparentes. */
  for (let pass = 0; pass < 12; pass++) {
    let filled = 0;
    for (let y = 0; y < SH; y++) {
      for (let x = 0; x < W; x++) {
        const k = (y * W + x) * 4;
        if (d[k + 3] !== 0) continue;
        let src = -1;
        if (x > 0) {
          const kl = k - 4;
          if (d[kl + 3] > 0) src = kl;
        }
        if (src < 0 && x < W - 1) {
          const kr = k + 4;
          if (d[kr + 3] > 0) src = kr;
        }
        if (src < 0 && y > 0) {
          const ku = k - W * 4;
          if (d[ku + 3] > 0) src = ku;
        }
        if (src < 0 && y < SH - 1) {
          const kd = k + W * 4;
          if (d[kd + 3] > 0) src = kd;
        }
        if (src < 0) continue;
        d[k] = d[src];
        d[k + 1] = d[src + 1];
        d[k + 2] = d[src + 2];
        d[k + 3] = d[src + 3];
        filled++;
      }
    }
    if (filled === 0) break;
  }
  sctx.putImageData(sd, 0, 0);

  const final = document.createElement('canvas');
  final.width = ARCHIVE_W;
  final.height = ARCHIVE_H;
  const fctx = final.getContext('2d', { willReadFrequently: true });
  if (!fctx) throw new Error('canvas 2D indisponible');
  fctx.imageSmoothingEnabled = true;
  fctx.drawImage(stitched, 0, GIBS_CROP_Y, stitched.width, GIBS_CROP_H, 0, 0, ARCHIVE_W, ARCHIVE_H);

  const fd = fctx.getImageData(0, 0, ARCHIVE_W, ARCHIVE_H);
  let visible = 0;
  for (let i = 3; i < fd.data.length; i += 4) if (fd.data[i] > 12) visible++;
  const coverage = visible / (ARCHIVE_W * ARCHIVE_H);
  if (coverage < 0.02) throw new Error('couverture GIBS trop faible (' + (coverage * 100).toFixed(1) + '%)');

  let mapUrl = '';
  try {
    mapUrl = final.toDataURL('image/jpeg', 0.82);
  } catch (e) {
    console.warn('[météo Terre] export de la mosaïque GIBS impossible : ' + (e as Error).message);
  }

  return { pixels: flipPixels(fd.data, ARCHIVE_W, ARCHIVE_H), mapUrl, coverage, tiles: drawn };
}

async function loadGibsArchive(dateKey: string): Promise<GibsResult> {
  let result: GibsResult | null = null;
  try {
    result = await composeGibsArchive('MODIS_Terra_CorrectedReflectance_TrueColor', dateKey);
  } catch (e) {
    console.warn('[météo Terre] MODIS Terra indisponible pour ' + dateKey + ' : ' + (e as Error).message);
  }
  if (!result) {
    try {
      result = await composeGibsArchive('MODIS_Aqua_CorrectedReflectance_TrueColor', dateKey);
    } catch (e) {
      console.warn('[météo Terre] MODIS Aqua indisponible pour ' + dateKey + ' : ' + (e as Error).message);
    }
  }
  if (!result) throw new Error('aucune mosaïque GIBS pour ' + dateKey);
  return result;
}

/* ---- Open-Meteo : grille de nébulosité 10° -> overlay nuages ---- */

async function loadOpenMeteoClouds(): Promise<{ pixels: Uint8Array; time: string }> {
  const points: LatLonPoint[] = [];
  for (let iy = 0; iy < OM_NY; iy++) {
    for (let ix = 0; ix < OM_NX; ix++) points.push({ lat: OM_LATS[iy], lon: OM_LONS[ix] });
  }
  const batches: LatLonPoint[][] = [];
  for (let i = 0; i < points.length; i += OM_BATCH) batches.push(points.slice(i, i + OM_BATCH));

  const values = new Float32Array(OM_NX * OM_NY);
  let got = 0;
  let time = '';
  const answers = await mapLimit(batches, OM_CONCURRENCY, async (batch) => {
    const latParam = batch.map((p) => p.lat).join(',');
    const lonParam = batch.map((p) => p.lon).join(',');
    const url =
      'https://api.open-meteo.com/v1/forecast?latitude=' +
      latParam +
      '&longitude=' +
      lonParam +
      '&current=cloud_cover&timezone=GMT';
    const raw = await fetchJSON<OmGridEntry | OmGridEntry[]>(url, OM_TIMEOUT);
    return Array.isArray(raw) ? raw : [raw];
  });

  for (const arr of answers) {
    if (!arr) continue;
    for (const o of arr) {
      if (!o || !o.current) continue;
      const la = Number(o.latitude);
      const lo = Number(o.longitude);
      const iy = weatherClamp(Math.round((80 - la) / OM_STEP), 0, OM_NY - 1);
      const ix = ((Math.round((lo + 180) / OM_STEP) % OM_NX) + OM_NX) % OM_NX;
      const v = o.current.cloud_cover;
      values[iy * OM_NX + ix] = typeof v === 'number' && Number.isFinite(v) ? weatherClamp(v, 0, 100) : 0;
      got++;
      if (!time && o.current.time) time = o.current.time;
    }
  }
  if (got < points.length * OM_MIN_RATIO) {
    throw new Error('réponses Open-Meteo insuffisantes (' + got + '/' + points.length + ')');
  }

  const out = new Uint8Array(LIVE_W * LIVE_H * 4);
  for (let y = 0; y < LIVE_H; y++) {
    const lat = 90 - ((y + 0.5) * 180) / LIVE_H;
    const fy = weatherClamp((80 - weatherClamp(lat, -80, 80)) / OM_STEP, 0, OM_NY - 1.0001);
    const y0 = Math.floor(fy);
    const y1 = Math.min(OM_NY - 1, y0 + 1);
    const ty = fy - y0;
    const dstRow = LIVE_H - 1 - y; // v = 1 au pôle nord
    for (let x = 0; x < LIVE_W; x++) {
      const lon = -180 + ((x + 0.5) * 360) / LIVE_W;
      const fxRaw = (lon + 180) / OM_STEP;
      const x0 = ((Math.floor(fxRaw) % OM_NX) + OM_NX) % OM_NX;
      const x1 = (x0 + 1) % OM_NX;
      const tx = fxRaw - Math.floor(fxRaw);
      const v00 = values[y0 * OM_NX + x0];
      const v10 = values[y0 * OM_NX + x1];
      const v01 = values[y1 * OM_NX + x0];
      const v11 = values[y1 * OM_NX + x1];
      const cover = (v00 * (1 - tx) + v10 * tx) * (1 - ty) + (v01 * (1 - tx) + v11 * tx) * ty;
      const k = (dstRow * LIVE_W + x) * 4;
      out[k] = 228;
      out[k + 1] = 238;
      out[k + 2] = 250;
      out[k + 3] = Math.round(weatherClamp(cover / 100, 0, 1) * 235);
    }
  }
  return { pixels: out, time };
}

/* ---- état et instantané UI ---- */

function setMode(mode: Mode, badge: string, cls: LegacyTone, source: string, active: boolean): void {
  internal.mode = mode;
  earthWeather.active = active;
  internal.badge = badge;
  /* live/archive n'existent pas dans BadgeClass ; WeatherCard les retrouve à
     partir de mapLabel (archive = mosaïque GIBS affichée). */
  internal.badgeClass = cls === 'live' || cls === 'archive' ? 'ok' : cls;
  internal.source = source;
}

function clearArchiveMap(): void {
  internal.mapUrl = null;
  internal.mapLabel = '';
  internal.archiveRows = [];
  internal.mapVersion++;
}

function applyLiveTexture(): void {
  if (!internal.livePixels) return;
  swapTexture(makeDataTexture(internal.livePixels, LIVE_W, LIVE_H));
  earthWeather.overlayOpacity = 0.52;
  earthWeather.cloudOnly = 1;
}

function composeSnapshot(): WeatherSnapshot {
  let note = '';
  let rows: WeatherRow[] = [];
  let mapUrl: string | null = null;
  let mapLabel = '';
  let point: WeatherRow[] = [];
  let pointLabel = '';

  if (!earthWeather.enabled) {
    note = 'Météo réelle désactivée. Les nuages procéduraux sont utilisés.';
  } else if (internal.mode === 'future') {
    note = 'Prévision indisponible pour une date future. Nuages simulés.';
  } else if (internal.mode === 'unavailable') {
    note = 'Aucune archive satellite GIBS avant 2000. Nuages simulés.';
  } else if (internal.loading && !earthWeather.active) {
    note = 'Chargement des données météo…';
  } else if (internal.mode === 'live' && !earthWeather.active) {
    note = 'Le direct est indisponible (réseau/CORS). Repli sur les nuages procéduraux.';
  } else if (internal.mode === 'archive' && !earthWeather.active) {
    note = 'Archive satellite indisponible pour cette date. Repli procédural.';
  } else if (internal.mode === 'archive') {
    mapUrl = internal.mapUrl;
    mapLabel = internal.mapLabel;
    rows = internal.archiveRows;
    if (internal.point) {
      pointLabel = latLonLabel(internal.point.lat, internal.point.lon);
      note = 'Conditions ponctuelles indisponibles hors direct. L’archive satellite reste affichée.';
    } else {
      note =
        'Archive satellite chargée. Les conditions ponctuelles Open-Meteo ne sont disponibles qu’en direct.';
    }
  } else if (internal.mode === 'live') {
    if (!internal.point) {
      note = 'Cliquez sur le globe pour la température, le vent, la pression et la nébulosité.';
    } else {
      pointLabel = latLonLabel(internal.point.lat, internal.point.lon);
      if (internal.pointLoading) {
        note = 'Interrogation d’Open-Meteo…';
      } else if (internal.pointData) {
        const d = internal.pointData;
        point = [
          { label: 'Température', value: NF2.format(d.temp) + ' °C' },
          { label: 'Vent', value: NF2.format(d.wind) + ' km/h' },
          { label: 'Pression', value: NF2.format(d.pressure) + ' hPa' },
          { label: 'Nébulosité', value: NF_INT.format(d.cloud) + ' %' },
        ];
        note = 'Open-Meteo · ' + (d.time || '') + ' UTC';
      } else {
        note = 'Conditions locales indisponibles.';
      }
    }
  } else if (internal.loading) {
    note = 'Chargement des données météo…';
  }

  return {
    badge: internal.badge || '—',
    badgeClass: internal.badgeClass,
    source: internal.source || '',
    rows,
    note,
    mapUrl,
    mapLabel,
    point,
    pointLabel,
  };
}

function compactBody(): string {
  if (!earthWeather.enabled) return 'Météo réelle désactivée';
  switch (internal.mode) {
    case 'live':
      return earthWeather.active ? 'Nébulosité en direct' : 'Direct indisponible';
    case 'archive':
      return earthWeather.active ? 'Archive satellite GIBS' : 'Archive indisponible';
    case 'future':
      return 'Prévision indisponible (date future)';
    case 'unavailable':
      return 'Pas d’archive avant 2000';
    case 'off':
      return 'Désactivée';
    default:
      return internal.loading ? 'Chargement…' : '—';
  }
}

function pushSnapshot(force = false): void {
  const pointKey = internal.point
    ? internal.point.lat.toFixed(2) + ',' + internal.point.lon.toFixed(2)
    : '';
  const dataKey = internal.pointData
    ? internal.pointData.time + '|' + internal.pointData.temp + '|' + internal.pointData.wind
    : '';
  const key = [
    earthWeather.enabled ? 1 : 0,
    internal.mode,
    internal.loading ? 1 : 0,
    earthWeather.active ? 1 : 0,
    internal.badge,
    internal.badgeClass,
    internal.source,
    internal.pointLoading ? 1 : 0,
    pointKey,
    dataKey,
    internal.mapVersion,
    internal.error,
  ].join('|');
  if (!force && key === internal.uiKey) return;
  internal.uiKey = key;

  const store = useStore.getState();
  store.setWeatherCard(composeSnapshot());
  store.setWeather({
    badge: internal.badge || '—',
    badgeClass: internal.badgeClass,
    source: internal.source || '',
    body: compactBody(),
  });
}

/* ---- chargements ---- */

async function loadEarthLiveWeather(): Promise<void> {
  if (!earthWeather.enabled || internal.loading) return;
  const token = ++internal.token;
  const wasActive = earthWeather.active && internal.mode === 'live';
  internal.loading = true;
  internal.error = '';
  setMode(
    'live',
    wasActive ? 'Actualisation…' : 'Chargement direct…',
    'warn',
    'Open-Meteo · nébulosité actuelle',
    wasActive,
  );
  pushSnapshot(true);
  try {
    const result = await loadOpenMeteoClouds();
    if (token !== internal.token || !earthWeather.enabled) return;
    internal.livePixels = result.pixels;
    internal.liveTime = result.time;
    applyLiveTexture();
    earthWeather.active = true;
    internal.lastRefresh = Date.now();
    clearArchiveMap();
    setMode(
      'live',
      'EN DIRECT',
      'live',
      'Open-Meteo · nébulosité actuelle' + (result.time ? ' · ' + result.time + ' UTC' : ''),
      true,
    );
    console.info('[météo Terre] direct Open-Meteo chargé.');
  } catch (e) {
    if (token !== internal.token) return;
    internal.lastRefresh = Date.now();
    internal.error = (e as Error).message || String(e);
    if (internal.livePixels) {
      earthWeather.active = true;
      setMode(
        'live',
        'EN DIRECT (dernière valeur)',
        'live',
        'Open-Meteo · nébulosité (cache' +
          (internal.liveTime ? ' · ' + internal.liveTime + ' UTC' : '') +
          ')',
        true,
      );
    } else {
      earthWeather.active = false;
      setMode('live', 'Direct indisponible', 'warn', 'Repli : nuages procéduraux', false);
    }
    console.warn('[météo Terre] Open-Meteo indisponible : ' + internal.error);
  } finally {
    if (token === internal.token) {
      internal.loading = false;
      pushSnapshot(true);
    }
  }
}

async function loadEarthArchive(dateKey: string, token: number): Promise<void> {
  if (!earthWeather.enabled) return;
  internal.loading = true;
  internal.error = '';
  earthWeather.active = false;
  internal.archiveKey = dateKey;
  clearArchiveMap();
  setMode(
    'archive',
    'Chargement archive…',
    'warn',
    'NASA GIBS · MODIS TrueColor · ' + weatherDateLabel(dateKey),
    false,
  );
  pushSnapshot(true);
  try {
    const result = await loadGibsArchive(dateKey);
    if (token !== internal.token || !earthWeather.enabled || internal.key !== 'archive:' + dateKey) return;
    swapTexture(makeDataTexture(result.pixels, ARCHIVE_W, ARCHIVE_H));
    earthWeather.overlayOpacity = 0.94;
    earthWeather.cloudOnly = 0;
    earthWeather.active = true;
    internal.lastRefresh = Date.now();
    internal.mapUrl = result.mapUrl || null;
    internal.mapLabel = 'Mosaïque MODIS TrueColor · ' + weatherDateLabel(dateKey);
    internal.archiveRows = [
      { label: 'Couverture', value: NF1.format(result.coverage * 100) + ' %' },
      { label: 'Tuiles', value: result.tiles + '/15', sub: 'MODIS Terra/Aqua' },
    ];
    internal.mapVersion++;
    setMode(
      'archive',
      'Archive satellite ' + weatherDateLabel(dateKey),
      'archive',
      'NASA GIBS · MODIS Terra/Aqua TrueColor · ' +
        weatherDateLabel(dateKey) +
        ' · ' +
        result.tiles +
        '/15 tuiles',
      true,
    );
    console.info(
      '[météo Terre] archive GIBS ' +
        dateKey +
        ' chargée, couverture ' +
        (result.coverage * 100).toFixed(1) +
        '%.',
    );
  } catch (e) {
    if (token !== internal.token) return;
    earthWeather.active = false;
    internal.error = (e as Error).message || String(e);
    internal.lastRefresh = Date.now();
    clearArchiveMap();
    setMode('archive', 'Archive indisponible', 'warn', 'Repli : nuages procéduraux', false);
    console.warn('[météo Terre] archive GIBS indisponible : ' + internal.error);
  } finally {
    if (token === internal.token) {
      internal.loading = false;
      pushSnapshot(true);
    }
  }
}

/* ---- planification (une fois par seconde) ---- */

function scheduleEarthWeather(): void {
  if (!earthWeather.enabled) {
    setMode('off', 'Désactivée', 'off', '', false);
    pushSnapshot();
    return;
  }
  const nowMs = Date.now();
  const nowJD = dateToJD(new Date());
  const dh = (clock.jd - nowJD) * 24;
  const parts = jdToDateParts(clock.jd);
  const dateKey = weatherDateKey(clock.jd);

  if (dh > WEATHER_LIVE_WINDOW_H) {
    earthWeather.active = false;
    internal.key = 'future';
    clearArchiveMap();
    setMode('future', 'Prévision indisponible', 'warn', 'Nuages procéduraux (date future)', false);
    pushSnapshot();
    return;
  }

  if (dh >= -WEATHER_LIVE_WINDOW_H) {
    const previous = internal.key;
    internal.key = 'live';
    if (previous !== 'live' && !internal.loading) {
      if (internal.livePixels) {
        applyLiveTexture();
        earthWeather.active = true;
        internal.source = 'Open-Meteo · nébulosité (dernière valeur)';
      } else {
        earthWeather.active = false;
      }
    }
    if (!internal.loading) {
      const sameMode = internal.mode === 'live';
      const age = sameMode && internal.lastRefresh ? nowMs - internal.lastRefresh : Infinity;
      if ((!earthWeather.active && age > LIVE_RETRY_MS) || (earthWeather.active && age > WEATHER_REFRESH_MS)) {
        void loadEarthLiveWeather();
      }
    }
    setMode(
      'live',
      earthWeather.active ? 'EN DIRECT' : internal.loading ? 'Chargement direct…' : 'Direct indisponible',
      earthWeather.active ? 'live' : 'warn',
      internal.source || 'Open-Meteo · nébulosité actuelle',
      earthWeather.active,
    );
    pushSnapshot();
    return;
  }

  if (parts.year < 2000) {
    earthWeather.active = false;
    internal.key = 'unavailable';
    clearArchiveMap();
    setMode(
      'unavailable',
      'Archive indisponible',
      'warn',
      'GIBS/MODIS : pas de mosaïque avant 2000 — nuages procéduraux',
      false,
    );
    pushSnapshot();
    return;
  }

  const key = 'archive:' + dateKey;
  if (internal.mode !== 'archive' || internal.archiveKey !== dateKey) {
    earthWeather.active = false;
  }
  internal.key = key;
  if (earthWeather.active && internal.archiveKey === dateKey) {
    pushSnapshot();
    return;
  }
  if (internal.loading) return;
  if (
    internal.mode === 'archive' &&
    internal.archiveKey === dateKey &&
    internal.lastRefresh &&
    nowMs - internal.lastRefresh < ARCHIVE_REFRESH_MS
  ) {
    return;
  }
  if (internal.pendingKey !== key) {
    internal.pendingKey = key;
    internal.pendingSince = nowMs;
    return;
  }
  if (nowMs - internal.pendingSince < ARCHIVE_DEBOUNCE_MS) return;
  internal.pendingKey = '';
  const token = ++internal.token;
  void loadEarthArchive(dateKey, token);
}

/* ---- météo ponctuelle (clic globe) ---- */

async function fetchPointWeather(lat: number, lon: number): Promise<void> {
  const token = ++internal.pointToken;
  const key = lat.toFixed(1) + ',' + lon.toFixed(1);
  if (internal.pointCache && internal.pointCache.key === key && Date.now() - internal.pointCache.at < POINT_CACHE_MS) {
    internal.pointData = internal.pointCache.data;
    internal.pointLoading = false;
    pushSnapshot(true);
    return;
  }
  internal.pointLoading = true;
  pushSnapshot(true);
  try {
    const url =
      'https://api.open-meteo.com/v1/forecast?latitude=' +
      lat.toFixed(4) +
      '&longitude=' +
      lon.toFixed(4) +
      '&current=temperature_2m,wind_speed_10m,surface_pressure,cloud_cover&timezone=GMT';
    let d: OmPointEntry;
    try {
      d = await fetchJSON<OmPointEntry>(url, POINT_TIMEOUT);
    } catch (e) {
      if (!/429/.test((e as Error).message || '')) throw e;
      await new Promise<void>((resolve) => setTimeout(resolve, POINT_RETRY_DELAY));
      d = await fetchJSON<OmPointEntry>(url, POINT_TIMEOUT);
    }
    if (token !== internal.pointToken) return;
    const c = d.current || {};
    internal.pointData = {
      temp: Number(c.temperature_2m),
      wind: Number(c.wind_speed_10m),
      pressure: Number(c.surface_pressure),
      cloud: Number(c.cloud_cover),
      time: c.time || '',
    };
    internal.pointCache = { key, at: Date.now(), data: internal.pointData };
  } catch (e) {
    if (token !== internal.pointToken) return;
    internal.pointData = null;
    console.warn('[météo Terre] Open-Meteo ponctuel indisponible : ' + ((e as Error).message || e));
  } finally {
    if (token === internal.pointToken) {
      internal.pointLoading = false;
      pushSnapshot(true);
    }
  }
}

/* ---- API consommée par la scène et la boucle ---- */

export const earthWeather = {
  active: false,
  overlayOpacity: 0.92,
  cloudOnly: 0,
  texture: null as THREE.Texture | null,
  enabled: true,

  setEnabled(on: boolean): void {
    const next = !!on;
    earthWeather.enabled = next;
    const store = useStore.getState();
    if (store.layers.earthWeather !== next) store.setLayer('earthWeather', next);
    if (!next) {
      internal.token++;
      internal.loading = false;
      earthWeather.active = false;
      internal.pointData = null;
      internal.pointLoading = false;
      internal.pendingKey = '';
      setMode('off', 'Désactivée', 'off', '', false);
    } else {
      internal.lastRefresh = 0;
      internal.key = '';
      internal.pendingKey = '';
      setMode('idle', 'Chargement…', 'off', '', false);
    }
    pushSnapshot(true);
  },

  /* Le point reçu est déjà dans le repère local de la sphère (Earth.tsx fait
     mesh.worldToLocal) : même convention que latLonToVector3, latitude en
     degrés, longitude est-positif. */
  onClick(localPoint: THREE.Vector3): void {
    const geo = vector3ToLatLon(localPoint);
    internal.point = { lat: geo.lat, lon: geo.lon };
    internal.pointData = null;
    internal.pointLoading = false;
    pushSnapshot(true);
    if (!earthWeather.enabled) return;
    if (internal.mode !== 'live') return;
    void fetchPointWeather(geo.lat, geo.lon);
  },

  tick(_dt: number, now: number): void {
    const layerOn = useStore.getState().layers.earthWeather;
    if (layerOn !== earthWeather.enabled) earthWeather.setEnabled(layerOn);

    if (now - internal.lastCheck > 1000) {
      internal.lastCheck = now;
      scheduleEarthWeather();
    }
    if (
      internal.mode === 'live' &&
      earthWeather.active &&
      earthWeather.enabled &&
      Date.now() - internal.lastRefresh > WEATHER_REFRESH_MS &&
      !internal.loading
    ) {
      internal.lastRefresh = Date.now();
      void loadEarthLiveWeather();
    }
  },
};
