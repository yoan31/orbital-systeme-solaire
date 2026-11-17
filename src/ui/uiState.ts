import { useStore } from '../state/store';

/* État des panneaux mobiles (tiroirs gauche/droite). */
export function closePanels(): void {
  useStore.getState().setMobilePanel(null);
}

export function openPanel(which: 'left' | 'right'): void {
  useStore.getState().setMobilePanel(which);
}
