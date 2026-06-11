import { state, $, btnPausePreview, btnStopPreview, textPause, iconPause, bpmInput } from './state.js';
import { drawPianoRoll } from './piano-roll.js';
import { PLAY_SVG } from './helpers.js';

export function stopAllChannels() {
  Object.values(state.activeChannelSources).forEach((src) => {
    try { src.stop(); } catch (e) {}
  });
  state.activeChannelSources = {};

  document.querySelectorAll('.btn-play-channel').forEach(btn => {
    btn.innerHTML = PLAY_SVG;
    btn.classList.remove('text-red-500');
    btn.classList.add('text-neutral-600');
  });
}

export function initAdsrSliders() {
  const adsrInputs = ['attack', 'decay', 'sustain', 'release'];
  adsrInputs.forEach(type => {
    const input = document.getElementById(`synth-${type}`);
    const label = document.getElementById(`label-${type}`);
    if (input && label) {
      input.addEventListener('input', () => {
        const val = parseFloat(input.value);
        if (type === 'sustain') {
          label.textContent = `${Math.round(val * 100)}%`;
        } else {
          label.textContent = `${val.toFixed(2)}s`;
        }
      });
    }
  });
}

export function stopPreview() {
  state.isPlaying = false;

  if (state.playAnimationId) {
    cancelAnimationFrame(state.playAnimationId);
    state.playAnimationId = null;
  }

  if (state.audioCtx && state.audioCtx.state === 'suspended') {
    state.audioCtx.resume();
  }

  state.activeOscillators.forEach((osc) => {
    try { osc.stop(); } catch (e) {}
  });
  state.activeOscillators = [];

  state.activeSampleSources.forEach((src) => {
    try { src.stop(); } catch (e) {}
  });
  state.activeSampleSources = [];

  btnPausePreview.disabled = true;
  btnStopPreview.disabled = true;
  textPause.textContent = 'Pause';
  iconPause.innerHTML = '<path d="M5.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75A.75.75 0 007.25 3h-1.5zM12.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75a.75.75 0 00-.75-.75h-1.5z" />';

  const filteredNotes = state.selectedChannelRackIndex === -1
    ? state.currentNotes
    : state.currentNotes.filter((n) => n.rack === state.selectedChannelRackIndex);

  setTimeout(() => {
    drawPianoRoll(filteredNotes, state.currentPPQ);
  }, 0);
}

export function togglePausePreview() {
  if (!state.audioCtx) return;

  if (state.audioCtx.state === 'running') {
    state.audioCtx.suspend().then(() => {
      textPause.textContent = 'Resume';
      iconPause.innerHTML = '<path d="M6.3 2.841A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.269l9.324-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />';
    });
  } else if (state.audioCtx.state === 'suspended') {
    state.audioCtx.resume().then(() => {
      textPause.textContent = 'Pause';
      iconPause.innerHTML = '<path d="M5.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75A.75.75 0 007.25 3h-1.5zM12.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75a.75.75 0 00-.75-.75h-1.5z" />';
    });
  }
}

export function playPreview() {
  stopPreview();

  const filteredNotes = state.selectedChannelRackIndex === -1
    ? state.currentNotes
    : state.currentNotes.filter((n) => n.rack === state.selectedChannelRackIndex);

  if (filteredNotes.length === 0) return;

  if (!state.audioCtx) {
    state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }

  if (state.audioCtx.state === 'suspended') {
    state.audioCtx.resume();
  }

  state.isPlaying = true;
  btnPausePreview.disabled = false;
  btnStopPreview.disabled = false;
  textPause.textContent = 'Pause';
  iconPause.innerHTML = '<path d="M5.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75A.75.75 0 007.25 3h-1.5zM12.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75a.75.75 0 00-.75-.75h-1.5z" />';

  const tempo = bpmInput ? parseFloat(bpmInput.value) || 130 : 130;
  const secondsPerTick = 60 / (tempo * state.currentPPQ);
  state.playStartTime = state.audioCtx.currentTime + 0.1;

  const waveformRadio = document.querySelector('input[name="synth-waveform"]:checked');
  const waveform = waveformRadio ? waveformRadio.value : 'triangle';

  const attackInput = document.getElementById('synth-attack');
  const decayInput = document.getElementById('synth-decay');
  const sustainInput = document.getElementById('synth-sustain');
  const releaseInput = document.getElementById('synth-release');

  const attack = attackInput ? parseFloat(attackInput.value) : 0.05;
  const decay = decayInput ? parseFloat(decayInput.value) : 0.10;
  const sustain = sustainInput ? parseFloat(sustainInput.value) : 0.60;
  const release = releaseInput ? parseFloat(releaseInput.value) : 0.30;

  filteredNotes.forEach((note) => {
    const noteTime = state.playStartTime + note.position * secondsPerTick;
    const noteDuration = note.duration * secondsPerTick;

    const gainNode = state.audioCtx.createGain();
    const maxVolume = (note.velocity / 127) * 0.12;
    const sustainVolume = maxVolume * sustain;

    gainNode.gain.setValueAtTime(0, noteTime);
    gainNode.gain.linearRampToValueAtTime(maxVolume, noteTime + attack);
    gainNode.gain.linearRampToValueAtTime(sustainVolume, noteTime + attack + decay);
    gainNode.gain.setValueAtTime(sustainVolume, noteTime + noteDuration);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, noteTime + noteDuration + release);

    gainNode.connect(state.audioCtx.destination);

    const sampleBuffer = state.sampleBuffers[note.rack];

    if (sampleBuffer) {
      const source = state.audioCtx.createBufferSource();
      source.buffer = sampleBuffer;
      source.playbackRate.value = Math.pow(2, (note.key - 60) / 12);
      source.connect(gainNode);
      source.start(noteTime);
      source.stop(noteTime + noteDuration + release);

      state.activeSampleSources.push(source);
    } else {
      const freq = 440 * Math.pow(2, (note.key - 69) / 12);
      const osc = state.audioCtx.createOscillator();

      osc.type = waveform;
      osc.frequency.setValueAtTime(freq, noteTime);
      osc.connect(gainNode);

      osc.start(noteTime);
      osc.stop(noteTime + noteDuration + release);

      state.activeOscillators.push(osc);
    }
  });

  function animatePlayhead() {
    if (!state.isPlaying || !state.audioCtx) return;

    const elapsed = state.audioCtx.currentTime - state.playStartTime;
    const currentTick = elapsed / secondsPerTick;

    if (currentTick >= state.currentMaxEnd) {
      stopPreview();
      return;
    }

    drawPianoRoll(filteredNotes, state.currentPPQ, currentTick);
    state.playAnimationId = requestAnimationFrame(animatePlayhead);
  }

  state.playAnimationId = requestAnimationFrame(animatePlayhead);
}
