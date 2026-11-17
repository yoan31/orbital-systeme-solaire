import { useStore } from '../state/store';
import { closePanels, openPanel } from './uiState';

export function MobileTabs() {
  const panel = useStore((s) => s.mobilePanel);
  return (
    <>
      <div id="mobileTabs">
        <button id="tabLeft" aria-label="Ouvrir le panneau des corps célestes" onClick={() => openPanel('left')}>
          ◧&nbsp; Corps
        </button>
        <button id="tabRight" aria-label="Ouvrir la fiche de l'astre" onClick={() => openPanel('right')}>
          Fiche &nbsp;◨
        </button>
      </div>
      <div id="scrim" className={`scrim${panel ? ' show' : ''}`} onClick={closePanels} />
    </>
  );
}
