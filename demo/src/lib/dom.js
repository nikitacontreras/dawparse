import { statusContainer, loadingSpinner, errorAlert, errorMessage, dashboard } from './state.js';

export function showLoading() {
  statusContainer.classList.remove('hidden');
  loadingSpinner.classList.remove('hidden');
  errorAlert.classList.add('hidden');
  dashboard.classList.add('hidden');
}

export function showError(msg) {
  statusContainer.classList.remove('hidden');
  loadingSpinner.classList.add('hidden');
  errorAlert.classList.remove('hidden');
  errorMessage.textContent = msg;
  dashboard.classList.add('hidden');
}
