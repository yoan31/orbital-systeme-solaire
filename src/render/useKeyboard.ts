import { useEffect } from 'react';
import { BODY_LIST } from '../astro/info';
import { useStore } from '../state/store';
import { focusBody, viewFromEarth, viewSide, viewTop } from '../render/camera';
import { bumpJD, goToNow, togglePlayback } from '../ui/actions';
import { closePanels } from '../ui/uiState';

/* Raccourcis clavier identiques au moteur d'origine (mêmes touches, mêmes
   garde-fous sur les champs de saisie). */
export function useKeyboard(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName ?? '';
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      const s = useStore.getState();
      switch (e.key) {
        case ' ':
          e.preventDefault();
          togglePlayback();
          break;
        case 'r':
        case 'R':
          goToNow();
          break;
        case 't':
        case 'T':
          viewTop();
          break;
        case 'c':
        case 'C':
          viewSide();
          break;
        case 'e':
        case 'E':
          viewFromEarth();
          break;
        case 'f':
        case 'F':
          focusBody(s.selected);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          bumpJD(-(e.shiftKey ? 1 / 24 : 1));
          break;
        case 'ArrowRight':
          e.preventDefault();
          bumpJD(e.shiftKey ? 1 / 24 : 1);
          break;
        case 'Escape':
          s.setModal(null);
          closePanels();
          break;
        default:
          if (/^[1-9]$/.test(e.key)) {
            const key = BODY_LIST[+e.key - 1];
            if (key) s.select(key, true);
          }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
