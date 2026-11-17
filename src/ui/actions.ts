import type { QualityName } from '../astro/quality';
import type { LayerKey } from '../state/store';
import { clock, goNow, parseDateInput, setJD } from '../state/clock';
import { useStore } from '../state/store';
import { bodies } from '../render/registry';
import { closePanels } from './uiState';
import { focusBody, setFollow, viewFromEarth, viewSide, viewTop } from '../render/camera';
import { applyScales } from '../render/frame';

/* Actions partagées barre/panneaux/dock : la source de vérité de l'horloge est
   `clock` (hors React), le store ne reçoit qu'un miroir pour l'affichage. */
export function togglePlayback(): void {
  clock.playing = !clock.playing;
  useStore.setState({ playing: clock.playing });
}

export function reverseTime(): void {
  clock.direction = clock.direction > 0 ? -1 : 1;
  useStore.setState({ direction: clock.direction });
}

export function goToNow(): void {
  goNow();
  useStore.setState({ jd: clock.jd });
}

export function setSpeed(speed: number): void {
  clock.speed = speed;
  useStore.setState({ speed });
}

export function bumpJD(days: number): void {
  setJD(clock.jd + days);
  useStore.setState({ jd: clock.jd });
}

export function applyDateInput(value: string): void {
  const jd = parseDateInput(value);
  if (jd === null) {
    useStore.getState().pushToast('Date invalide', 'Utilisez le format AAAA-MM-JJ HH:MM:SS (UTC).', 'err');
    return;
  }
  setJD(jd);
  useStore.setState({ jd: clock.jd });
}

export function applyQuality(name: QualityName): void {
  const s = useStore.getState();
  if (name === 'auto') {
    s.setQuality('auto');
    s.setTier('high');
  } else {
    s.setQuality(name);
    s.setTier(name);
  }
}

export function selectMode(mode: 'ped' | 'real'): void {
  const s = useStore.getState();
  if (s.mode === mode) return;
  s.setMode(mode);
  // Les rayons monde dépendent du mode : appliquer les échelles AVANT de
  // recadrer, sinon la caméra se place à la distance de l'ancien palier.
  applyScales();
  const selected = useStore.getState().selected;
  if (bodies.has(selected)) focusBody(selected);
  else viewTop();
}

export function followSelected(): void {
  const s = useStore.getState();
  if (s.follow === s.selected) setFollow(null);
  else focusBody(s.selected);
}

export function showView(which: 'top' | 'side' | 'earth'): void {
  if (which === 'top') viewTop();
  else if (which === 'side') viewSide();
  else viewFromEarth();
}

export function openModal(name: 'credits' | 'solar' | 'help'): void {
  useStore.getState().setModal(name);
}

export function switchLayer(key: LayerKey, value: boolean): void {
  useStore.getState().setLayer(key, value);
  closePanelsOnMobile();
}

function closePanelsOnMobile(): void {
  if (window.innerWidth <= 980) closePanels();
}

export { closePanels };
