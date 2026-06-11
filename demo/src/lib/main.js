import { FLP } from 'dawparse';

import {
  dropzone, fileInput
} from './state.js';
import { showLoading, showError } from './dom.js';
import { renderDashboard } from './dashboard.js';
import { initTabs } from './tabs.js';
import { initAdsrSliders, playPreview, stopPreview, togglePausePreview } from './audio.js';

import { btnPlayPreview, btnStopPreview, btnPausePreview } from './state.js';

function processFile(file) {
  showLoading();

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const buffer = new Uint8Array(event.target.result);
      const isZip = file.name.toLowerCase().endsWith('.zip');
      const flp = isZip ? new FLP({ zip: buffer }) : new FLP({ file: buffer });
      renderDashboard(flp, file.name, isZip);
    } catch (err) {
      showError(err.message || String(err));
    }
  };
  reader.onerror = () => {
    showError('Failed to read uploaded file binary content.');
  };
  reader.readAsArrayBuffer(file);
}

dropzone.addEventListener('click', () => fileInput.click());

dropzone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropzone.classList.add('border-neutral-900', 'bg-neutral-100');
});

dropzone.addEventListener('dragleave', () => {
  dropzone.classList.remove('border-neutral-900', 'bg-neutral-100');
});

dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropzone.classList.remove('border-neutral-900', 'bg-neutral-100');
  if (e.dataTransfer?.files?.length) {
    processFile(e.dataTransfer.files[0]);
  }
});

fileInput.addEventListener('change', () => {
  if (fileInput.files?.length) {
    processFile(fileInput.files[0]);
  }
});

btnPlayPreview.addEventListener('click', playPreview);
btnStopPreview.addEventListener('click', stopPreview);
btnPausePreview.addEventListener('click', togglePausePreview);

initAdsrSliders();
initTabs();
