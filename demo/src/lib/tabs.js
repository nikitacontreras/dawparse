import { $, state, pianoRollCanvas, pianoRollInfo } from './state.js';
import { drawPianoRoll } from './piano-roll.js';
import { stopPreview } from './audio.js';

export function initTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');

  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const tabName = btn.getAttribute('data-tab');

      tabBtns.forEach((t) => {
        t.classList.remove('border-neutral-900', 'text-neutral-900');
        t.classList.add('border-transparent', 'text-neutral-500');
      });
      btn.classList.add('border-neutral-900', 'text-neutral-900');
      btn.classList.remove('border-transparent', 'text-neutral-500');

      tabPanels.forEach((panel) => {
        if (panel.id === `panel-${tabName}`) {
          panel.classList.remove('hidden');
        } else {
          panel.classList.add('hidden');
        }
      });

      if (tabName === 'notes' && state.currentNotes.length > 0) {
        requestAnimationFrame(() => {
          const filteredNotes = state.selectedChannelRackIndex === -1
            ? state.currentNotes
            : state.currentNotes.filter((n) => n.rack === state.selectedChannelRackIndex);
          drawPianoRoll(filteredNotes, state.currentPPQ);
        });
      } else {
        stopPreview();
      }
    });
  });

  window.addEventListener('resize', () => {
    if (state.currentNotes.length > 0) {
      const filteredNotes = state.selectedChannelRackIndex === -1
        ? state.currentNotes
        : state.currentNotes.filter((n) => n.rack === state.selectedChannelRackIndex);
      drawPianoRoll(filteredNotes, state.currentPPQ);
    }
  });
}
