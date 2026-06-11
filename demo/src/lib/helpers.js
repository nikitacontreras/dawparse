export function renderBadge(status, trueLabel, falseLabel) {
  const isActive = !!status;
  const colorClass = isActive
    ? 'bg-neutral-900 text-white font-medium border border-neutral-900'
    : 'bg-white text-neutral-400 border border-neutral-200';
  return `<span class="px-2 py-0.5 rounded-full text-xs font-sans ${colorClass}">${isActive ? trueLabel : falseLabel}</span>`;
}

export function getNoteName(key) {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(key / 12) - 1;
  const noteName = notes[key % 12];
  return `${noteName}${octave}`;
}

export function cleanString(str) {
  if (typeof str !== 'string') return '';
  let cleaned = str.replace(/\u0000/g, '');
  return cleaned.trim();
}

export function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

export const RACK_COLORS = [
  { fill: 'rgba(249, 115, 22, alpha)', stroke: '#ea580c' },
  { fill: 'rgba(14, 165, 233, alpha)', stroke: '#0284c7' },
  { fill: 'rgba(168, 85, 247, alpha)', stroke: '#9333ea' },
  { fill: 'rgba(16, 185, 129, alpha)', stroke: '#059669' },
  { fill: 'rgba(244, 63, 94, alpha)', stroke: '#e11d48' },
  { fill: 'rgba(234, 179, 8, alpha)', stroke: '#ca8a04' },
  { fill: 'rgba(99, 102, 241, alpha)', stroke: '#4f46e5' },
  { fill: 'rgba(20, 184, 166, alpha)', stroke: '#0d9488' },
];

export const PLAY_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-3 h-3 ml-0.5"><path fill-rule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clip-rule="evenodd" /></svg>';
export const STOP_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-3 h-3"><path fill-rule="evenodd" d="M4.5 7.5a3 3 0 0 1 3-3h9a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3h-9a3 3 0 0 1-3-3v-9Z" clip-rule="evenodd" /></svg>';
