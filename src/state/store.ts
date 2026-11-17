import { create } from 'zustand';
import type { Mode, QualityName, TierName } from '../astro/quality';
import { COMET_KEYS } from '../astro/constants';

const COMET_LOOKUP: Record<string, true> = {};
for (const key of COMET_KEYS) COMET_LOOKUP[key] = true;

export interface Layers {
  orbits: boolean;
  labels: boolean;
  grid: boolean;
  velocity: boolean;
  axes: boolean;
  belts: boolean;
  comets: boolean;
  satellites: boolean;
  atmospheres: boolean;
  earthWeather: boolean;
  solarWeather: boolean;
}

export type LayerKey = keyof Layers;

export interface Toast {
  id: number;
  title: string;
  message: string;
  type: '' | 'warn' | 'err';
}

export interface TextureStatusEntry {
  source: 'local' | 'remote' | 'procedural';
  url: string;
  label: string;
  errors: string[];
  expected: boolean;
}

export interface GpuInfo {
  name: string;
  short: string;
  software: boolean;
  webgpu: boolean;
  webgpuInfo: string;
}

export interface MoonInfo {
  illum: number;
  elongDeg: number;
  phase: string;
  waxing: boolean;
  solar: string;
  lunar: string;
  umbraFactor: number;
}

export interface DebugHud {
  subsolar: string;
  era: string;
  nadir: string;
  sunDir: string;
  assertsOk: number;
  assertsTotal: number;
}

export type ModalName = 'credits' | 'solar' | 'help';
export type MobilePanel = 'left' | 'right' | null;

export type BadgeClass = 'off' | 'ok' | 'warn' | 'err';

export interface WeatherStatus {
  badge: string;
  badgeClass: BadgeClass;
  source: string;
  body: string;
}

export interface WeatherRow {
  label: string;
  value: string;
  sub?: string;
}

/* Instantané de la carte météo Terre (RightPanel), poussé par le service. */
export interface WeatherSnapshot {
  badge: string;
  badgeClass: BadgeClass;
  source: string;
  rows: WeatherRow[];
  note: string;
  mapUrl: string | null;
  mapLabel: string;
  point: WeatherRow[];
  pointLabel: string;
}

/* Instantané de la météo solaire (modale + panneau compact). */
export interface SolarSnapshot {
  badge: string;
  badgeClass: BadgeClass;
  issued: string;
  compactText: string;
  wave: string;
  imageUrl: string;
  imageLoading: boolean;
  note: string;
  flare: string;
  legend: string;
  probM: string;
  probX: string;
  wind: string;
  density: string;
  bz: string;
  kp: string;
  scales: { label: string; value: string }[];
  alerts: { title: string; lines: string[] }[];
  forecast: string;
  xray: number[];
  live: boolean;
}

interface State {
  /* horloge, miroir UI (rafraîchi par la boucle, pas la source de vérité) */
  jd: number;
  fps: number;
  playing: boolean;
  direction: 1 | -1;
  speed: number;

  /* sélection et caméra */
  selected: string;
  follow: string | null;

  /* rendu */
  mode: Mode;
  quality: QualityName;
  tier: TierName;
  dpr: number;

  layers: Layers;
  outOfRange: boolean;
  moon: MoonInfo | null;
  debugLight: boolean;
  debugHud: DebugHud;

  toasts: Toast[];
  textureStatus: Record<string, TextureStatusEntry>;
  gpu: GpuInfo;
  webgpuState: string;

  loaderDone: boolean;

  modal: ModalName | null;
  mobilePanel: MobilePanel;

  weather: WeatherStatus;
  solar: WeatherStatus;
  weatherCard: WeatherSnapshot;
  solarData: SolarSnapshot;

  select: (key: string, doFocus?: boolean) => void;
  setFollow: (key: string | null) => void;
  setMode: (mode: Mode) => void;
  setQuality: (quality: QualityName) => void;
  setTier: (tier: TierName) => void;
  setLayer: (key: LayerKey, value: boolean) => void;
  togglePlay: () => void;
  setDirection: (direction: 1 | -1) => void;
  setSpeed: (speed: number) => void;
  pushToast: (title: string, message?: string, type?: '' | 'warn' | 'err', timeout?: number) => void;
  dismissToast: (id: number) => void;
  setTextureStatus: (status: Record<string, TextureStatusEntry>) => void;
  setGpu: (gpu: GpuInfo, webgpuState: string) => void;
  setLoaderDone: (done: boolean) => void;
  setModal: (modal: ModalName | null) => void;
  setMobilePanel: (panel: MobilePanel) => void;
  setDebugLight: (on: boolean) => void;
  setDebugHud: (hud: Partial<DebugHud>) => void;
  setMoon: (moon: MoonInfo) => void;
  setWeather: (w: Partial<WeatherStatus>) => void;
  setSolar: (s: Partial<WeatherStatus>) => void;
  setWeatherCard: (w: Partial<WeatherSnapshot>) => void;
  setSolarData: (s: Partial<SolarSnapshot>) => void;
  syncClock: (s: { jd: number; fps: number; playing: boolean; direction: 1 | -1; speed: number; outOfRange: boolean }) => void;
}

let toastSeq = 0;

export const DEFAULT_LAYERS: Layers = {
  orbits: true,
  labels: true,
  grid: false,
  velocity: false,
  axes: false,
  belts: true,
  comets: true,
  satellites: true,
  atmospheres: true,
  earthWeather: true,
  solarWeather: true,
};

export const useStore = create<State>((set, get) => ({
  jd: 0,
  fps: 60,
  playing: true,
  direction: 1,
  speed: 1,

  selected: 'sun',
  follow: null,

  mode: 'ped',
  quality: 'auto',
  tier: 'high',
  dpr: 1,

  layers: { ...DEFAULT_LAYERS },
  outOfRange: false,
  moon: null,
  debugLight: false,
  debugHud: { subsolar: '—', era: '—', nadir: '—', sunDir: '—', assertsOk: 0, assertsTotal: 0 },

  toasts: [],
  textureStatus: {},
  gpu: { name: 'GPU inconnu', short: '—', software: false, webgpu: false, webgpuInfo: '' },
  webgpuState: '…',

  loaderDone: false,

  modal: null,
  mobilePanel: null,

  weather: { badge: 'Chargement…', badgeClass: 'off', source: '', body: '—' },
  solar: { badge: 'Chargement…', badgeClass: 'off', source: '', body: '' },
  weatherCard: {
    badge: 'Chargement…',
    badgeClass: 'off',
    source: '',
    rows: [],
    note: '',
    mapUrl: null,
    mapLabel: '',
    point: [],
    pointLabel: '',
  },
  solarData: {
    badge: 'Chargement…',
    badgeClass: 'off',
    issued: '',
    compactText: 'Chargement…',
    wave: '0193',
    imageUrl: '',
    imageLoading: true,
    note: '',
    flare: '—',
    legend: '',
    probM: '—',
    probX: '—',
    wind: '—',
    density: '—',
    bz: '—',
    kp: '—',
    scales: [],
    alerts: [],
    forecast: 'Prévision indisponible.',
    xray: [],
    live: false,
  },

  select: (key, doFocus = true) => {
    const s = get();
    if (!s.layers.comets && key in COMET_LOOKUP) return;
    set({ selected: key });
    if (doFocus) VOID_FOCUS(key);
    if (doFocus && typeof window !== 'undefined' && window.innerWidth <= 980) set({ mobilePanel: 'right' });
  },
  setFollow: (key) => set({ follow: key }),
  setMode: (mode) => set({ mode }),
  setQuality: (quality) => set({ quality }),
  setTier: (tier) => set({ tier }),
  setLayer: (key, value) => {
    const layers = { ...get().layers, [key]: value };
    set({ layers });
    if (!layers.comets && get().selected in COMET_LOOKUP) set({ selected: 'sun' });
  },
  togglePlay: () => set({ playing: !get().playing }),
  setDirection: (direction) => set({ direction }),
  setSpeed: (speed) => set({ speed }),
  pushToast: (title, message = '', type = '', timeout = 7000) => {
    const id = ++toastSeq;
    set({ toasts: [...get().toasts, { id, title, message, type }] });
    if (timeout > 0) setTimeout(() => get().dismissToast(id), timeout);
  },
  dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
  setTextureStatus: (textureStatus) => set({ textureStatus }),
  setGpu: (gpu, webgpuState) => set({ gpu, webgpuState }),
  setLoaderDone: (loaderDone) => set({ loaderDone }),
  setModal: (modal) => set({ modal }),
  setMobilePanel: (mobilePanel) => set({ mobilePanel }),
  setDebugLight: (debugLight) => set({ debugLight }),
  setDebugHud: (hud) => set({ debugHud: { ...get().debugHud, ...hud } }),
  setMoon: (moon) => set({ moon }),
  setWeather: (w) => set({ weather: { ...get().weather, ...w } }),
  setSolar: (s) => set({ solar: { ...get().solar, ...s } }),
  setWeatherCard: (w) => set({ weatherCard: { ...get().weatherCard, ...w } }),
  setSolarData: (s) => set({ solarData: { ...get().solarData, ...s } }),
  syncClock: (c) => set(c),
}));

/* La sélection déclenche le focus caméra sans que le store importe three/R3F :
   le rig caméra enregistre son implémentation au chargement du module. */
let focusImpl: (key: string) => void = () => {};
export function registerFocus(fn: (key: string) => void): void {
  focusImpl = fn;
}
const VOID_FOCUS = (key: string) => focusImpl(key);
