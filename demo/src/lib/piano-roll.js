import { state, pianoRollCanvas, pianoRollInfo } from './state.js';
import { getNoteName, RACK_COLORS, drawRoundedRect } from './helpers.js';

export function drawPianoRoll(notes, ppq, playheadTick) {
  const canvas = pianoRollCanvas;
  const info = pianoRollInfo;
  if (!canvas || !info) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const rect = canvas.getBoundingClientRect();
  if (rect.width <= 0) return;

  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = 320 * dpr;
  ctx.scale(dpr, dpr);

  const width = rect.width;
  const height = 320;

  ctx.clearRect(0, 0, width, height);

  let minKey = 127;
  let maxKey = 0;
  let maxEnd = 0;

  notes.forEach((n) => {
    if (n.key < minKey) minKey = n.key;
    if (n.key > maxKey) maxKey = n.key;
    const end = n.position + n.duration;
    if (end > maxEnd) maxEnd = end;
  });

  minKey = Math.max(0, minKey - 1);
  maxKey = Math.min(127, maxKey + 1);
  const pitchRange = maxKey - minKey + 1;

  const minDuration = 4 * 4 * ppq;
  if (maxEnd < minDuration) maxEnd = minDuration;
  state.currentMaxEnd = maxEnd;

  info.textContent = `Pitches: ${getNoteName(minKey)} to ${getNoteName(maxKey)} | Total Duration: ${maxEnd} ticks`;

  const keyboardWidth = 45;
  const gridWidth = width - keyboardWidth;
  const rowHeight = height / pitchRange;

  const blackKeys = [1, 3, 6, 8, 10];

  // Grid background
  for (let r = 0; r < pitchRange; r++) {
    const currentKey = maxKey - r;
    const noteIndex = currentKey % 12;
    const isBlack = blackKeys.includes(noteIndex);
    const y = r * rowHeight;

    ctx.fillStyle = isBlack ? '#f5f5f5' : '#ffffff';
    ctx.fillRect(keyboardWidth, y, gridWidth, rowHeight);

    ctx.strokeStyle = '#e5e5e5';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(keyboardWidth, y + rowHeight);
    ctx.lineTo(width, y + rowHeight);
    ctx.stroke();
  }

  // Vertical grid lines
  const ticksPerBeat = ppq;
  const ticksPerBar = ppq * 4;

  for (let t = 0; t <= maxEnd; t += ticksPerBeat) {
    const x = keyboardWidth + (t / maxEnd) * gridWidth;
    const isBar = t % ticksPerBar === 0;

    ctx.strokeStyle = isBar ? '#d4d4d4' : '#f5f5f5';
    ctx.lineWidth = isBar ? 1 : 0.5;

    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  // MIDI Notes
  notes.forEach((note) => {
    const x = keyboardWidth + (note.position / maxEnd) * gridWidth;
    const w = (note.duration / maxEnd) * gridWidth;
    const row = maxKey - note.key;
    const y = row * rowHeight + 1.5;
    const h = rowHeight - 3;

    const alpha = 0.5 + (note.velocity / 127) * 0.45;
    const colorScheme = RACK_COLORS[note.rack % RACK_COLORS.length];
    ctx.fillStyle = colorScheme.fill.replace('alpha', String(alpha));
    ctx.strokeStyle = colorScheme.stroke;
    ctx.lineWidth = 1;

    drawRoundedRect(ctx, x, y, Math.max(2, w), Math.max(2, h), 2);
    ctx.fill();
    ctx.stroke();
  });

  // Piano keyboard
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, keyboardWidth, height);

  for (let r = 0; r < pitchRange; r++) {
    const currentKey = maxKey - r;
    const noteIndex = currentKey % 12;
    const isBlack = blackKeys.includes(noteIndex);
    const y = r * rowHeight;

    if (!isBlack) {
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(0, y + rowHeight);
      ctx.lineTo(keyboardWidth, y + rowHeight);
      ctx.stroke();

      if (noteIndex === 0 && rowHeight > 7) {
        ctx.fillStyle = '#64748b';
        ctx.font = `${Math.min(9, rowHeight - 2)}px monospace`;
        ctx.textBaseline = 'middle';
        ctx.fillText(getNoteName(currentKey), 3, y + rowHeight / 2);
      }
    }
  }

  for (let r = 0; r < pitchRange; r++) {
    const currentKey = maxKey - r;
    const noteIndex = currentKey % 12;
    const isBlack = blackKeys.includes(noteIndex);
    const y = r * rowHeight;

    if (isBlack) {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, y + 0.5, keyboardWidth * 0.65, rowHeight - 1);

      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(0, y + 0.5, keyboardWidth * 0.65, rowHeight - 1);
    }
  }

  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(keyboardWidth, 0);
  ctx.lineTo(keyboardWidth, height);
  ctx.stroke();

  // Playhead
  if (playheadTick !== undefined) {
    const playheadX = keyboardWidth + (playheadTick / maxEnd) * gridWidth;
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, height);
    ctx.stroke();

    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(playheadX - 4, 0);
    ctx.lineTo(playheadX + 4, 0);
    ctx.lineTo(playheadX, 5);
    ctx.fill();
  }
}
