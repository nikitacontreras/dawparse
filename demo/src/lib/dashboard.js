import { state, $ } from './state.js';
import {
  dropzone, fileInput, statusContainer, loadingSpinner, errorAlert, errorMessage, dashboard,
  metaFileType, metaBpm, metaChannels, metaPpq, metaEventsCount,
  detailFlpName, detailMagic, detailHeaderSize, detailFormat,
  zipFilesContainer, flpSamplesContainer, flpSamplesList, rawFlpOnlyMsg, zipFilesList,
  channelsList, channelsCountBadge,
  tracksList, tracksCountBadge,
  notesList, notesCountBadge,
  pianoRollContainer, patternSelectorContainer, patternButtonsList,
  channelSelectorContainer, channelButtonsList,
  eventsList, eventsCountBadge, bpmInput,
} from './state.js';
import { showLoading } from './dom.js';
import { renderBadge, getNoteName, RACK_COLORS, PLAY_SVG, STOP_SVG } from './helpers.js';
import { parseChannels, parsePatterns } from './parsers.js';
import { drawPianoRoll } from './piano-roll.js';
import { stopPreview, stopAllChannels } from './audio.js';

export function renderDashboard(flp, originalFileName, isZip) {
  statusContainer.classList.add('hidden');
  dashboard.classList.remove('hidden');

  stopPreview();
  stopAllChannels();

  // Overview cards
  metaFileType.textContent = isZip ? 'Zipped Package (.zip)' : 'FLP Project (.flp)';
  metaChannels.textContent = String(flp.project.header.channelCount);
  metaPpq.textContent = String(flp.project.header.ppq);
  metaEventsCount.textContent = String(flp.project.events.length);

  state.currentPPQ = flp.project.header.ppq;
  state.sampleBuffers = {};

  // FLP details
  detailFlpName.textContent = flp.flpName || originalFileName;
  detailMagic.textContent = flp.project.header.magic;
  detailHeaderSize.textContent = `${flp.project.header.headerSize} bytes`;
  detailFormat.textContent = `Mode ${flp.project.header.fmt}`;

  // ZIP files
  zipFilesList.innerHTML = '';
  if (isZip && flp.files) {
    zipFilesContainer.classList.remove('hidden');
    rawFlpOnlyMsg.classList.add('hidden');

    Object.entries(flp.files).forEach(([filename, bytes]) => {
      const row = document.createElement('tr');
      row.className = 'border-b border-neutral-100 hover:bg-neutral-50';
      row.innerHTML = `
        <td class="py-2 text-neutral-800 font-medium">${filename}</td>
        <td class="py-2 text-right text-neutral-600 font-mono">${bytes.length.toLocaleString()}</td>
      `;
      zipFilesList.appendChild(row);
    });
  } else {
    zipFilesContainer.classList.add('hidden');
    rawFlpOnlyMsg.classList.remove('hidden');
  }

  // Audio samples
  flpSamplesList.innerHTML = '';
  const sampleEvents = flp.project.events.filter((e) => e.id === 196 && typeof e.value === 'string' && e.value.trim().length > 0);

  if (sampleEvents.length > 0) {
    flpSamplesContainer.classList.remove('hidden');
    const uniqueSamples = Array.from(new Set(sampleEvents.map((e) => e.value)));

    uniqueSamples.forEach((samplePath) => {
      const row = document.createElement('tr');
      row.className = 'border-b border-neutral-100 hover:bg-neutral-50';
      row.innerHTML = `
        <td class="py-2 text-neutral-800 font-mono text-xs break-all">${samplePath}</td>
      `;
      flpSamplesList.appendChild(row);
    });
  } else {
    flpSamplesContainer.classList.add('hidden');
  }

  // Channels
  channelsList.innerHTML = '';
  const channels = parseChannels(flp.project.events);
  state.currentChannels = channels;
  channelsCountBadge.textContent = `${channels.length} Channels`;

  if (channels.length === 0) {
    channelsList.innerHTML = `
      <tr>
        <td colspan="6" class="py-8 text-center text-neutral-400 italic">No audio channels found.</td>
      </tr>
    `;
  } else {
    channels.forEach((ch) => {
      const row = document.createElement('tr');
      row.className = 'border-b border-neutral-100 hover:bg-neutral-50';

      const activeIcon = ch.enabled
        ? `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-5 h-5 text-emerald-600" title="Active"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>`
        : `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-5 h-5 text-neutral-300" title="Inactive"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>`;

      const panVal = ch.panning;
      let panLabel = 'C';
      if (panVal > 0) panLabel = `R${panVal}`;
      if (panVal < 0) panLabel = `L${Math.abs(panVal)}`;

      const dotPosition = Math.max(0, Math.min(100, 50 + (panVal / 2)));
      const panSlider = `
        <div class="flex items-center space-x-2 justify-end">
          <span class="text-xs font-mono text-neutral-500 w-10 text-right">${panLabel}</span>
          <div class="w-16 h-1 bg-neutral-200 rounded-full relative">
            <span class="absolute w-2 h-2 bg-neutral-800 rounded-full -top-0.5" style="left: calc(${dotPosition}% - 4px)"></span>
          </div>
        </div>
      `;

      const samplePath = ch.samplePath || '';
      const isGenerator = samplePath === 'Generator (No Sample)' || !samplePath;
      const filename = isGenerator ? 'Generator Plugin' : (samplePath.split('\\').pop()?.split('/').pop() || samplePath);

      let metadataHtml = '';
      if (ch.metadata && ch.metadata.length > 0) {
        metadataHtml = `
          <div class="${isGenerator ? '' : 'mt-2 pt-2 border-t border-neutral-200'}">
            <strong class="font-semibold text-neutral-800 block mb-1 uppercase tracking-wide">Channel Metadata (Raw Events)</strong>
            <ul class="space-y-0.5 mt-1 text-[10px] sm:text-xs">
              ${ch.metadata.map((m) => {
                let eventName = m.name;
                if (eventName === 'Unknown Event (213)') eventName = 'Plugin State (FLP_PluginParams)';

                let displayValue = '';
                let isObject = false;
                if (typeof m.value === 'object' && m.value !== null) {
                  if (m.value.rawPayload && Array.isArray(m.value.header)) {
                    const ps = m.value;
                    const pluginName = ps.strings?.find((s) => s.value?.includes('Serato'))?.value ||
                      ps.strings?.[0]?.value || 'Unknown Plugin';
                    const vstInfo = ps.vstChunk?.markers?.map((mk) => mk.name).join(' → ') || '';
                    const jsonSize = ps.vstChunk?.jsonSize || 0;
                    const sections = ps.sections?.map((s) => `${s.label}: ${s.size}B`).join(', ') || '';
                    const summary = {
                      plugin: pluginName,
                      vstMarkers: vstInfo,
                      embeddedJsonSize: jsonSize,
                      hasEmbeddedJson: ps.vstChunk?.embeddedJson !== null,
                      sections: sections,
                      totalSize: ps.rawPayload.length,
                      embeddedProject: ps.vstChunk?.embeddedJson || undefined
                    };
                    isObject = true;
                    displayValue = JSON.stringify(summary, null, 2);
                  } else if (m.value instanceof Uint8Array && m.value.length <= 5000) {
                    displayValue = JSON.stringify(Array.from(m.value));
                    isObject = true;
                  } else if (m.value instanceof Uint8Array || m.value.buffer || Object.keys(m.value).length > 5000) {
                    const len = m.value instanceof Uint8Array ? m.value.length : Object.keys(m.value).length;
                    
                    const blobId = `blob_${Math.random().toString(36).substring(2, 9)}`;
                    state.binaryBlobs[blobId] = m.value instanceof Uint8Array ? m.value : new Uint8Array(m.value.buffer || Object.values(m.value));
                    
                    displayValue = `[Binary Data Blob: ${len} bytes (Click to Download .bin)]`;
                    isObject = false;
                    return `<li class="metadata-row group/row cursor-pointer hover:bg-neutral-50 flex flex-col sm:flex-row sm:justify-between border-b border-neutral-100 last:border-0 pb-0.5 px-1 rounded transition-colors" data-blob-id="${blobId}" data-name="${eventName.replace(/"/g, '')}" title="Click to download raw binary bytes (.bin)"><span class="font-medium text-neutral-600 truncate mr-2 group-hover/row:text-neutral-900 transition-colors" title="${eventName}">${eventName}</span> <span class="text-indigo-500 font-mono font-semibold truncate max-w-[250px] text-right group-hover/row:text-indigo-700 transition-colors" title="${displayValue}">${displayValue}</span></li>`;
                  } else {
                    isObject = true;
                    displayValue = JSON.stringify(m.value, null, 2);
                  }
                } else {
                  displayValue = String(m.value);
                }

                const safeKey = String(eventName).replace(/"/g, '&quot;');
                const safeValue = String(displayValue).replace(/"/g, '&quot;');

                if (isObject) {
                  return `<li class="metadata-row group/row cursor-pointer hover:bg-neutral-50 flex flex-col border-b border-neutral-100 last:border-0 pb-1.5 pt-1 px-1 rounded transition-colors" data-key="${safeKey}" data-value="${safeValue}" title="Click to copy as JSON">
                    <span class="font-medium text-neutral-600 group-hover/row:text-neutral-900 transition-colors">${eventName}</span>
                    <pre class="text-[9px] text-neutral-500 font-mono bg-neutral-100 border border-neutral-200 p-1.5 rounded mt-1 overflow-x-auto whitespace-pre group-hover/row:text-neutral-800 transition-colors">${displayValue}</pre>
                  </li>`;
                } else {
                  return `<li class="metadata-row group/row cursor-pointer hover:bg-neutral-50 flex flex-col sm:flex-row sm:justify-between border-b border-neutral-100 last:border-0 pb-0.5 px-1 rounded transition-colors" data-key="${safeKey}" data-value="${safeValue}" title="Click to copy as JSON"><span class="font-medium text-neutral-600 truncate mr-2 group-hover/row:text-neutral-900 transition-colors" title="${eventName}">${eventName}</span> <span class="text-neutral-500 font-mono truncate max-w-[200px] text-right group-hover/row:text-neutral-800 transition-colors" title="${displayValue}">${displayValue}</span></li>`;
                }
              }).join('')}
            </ul>
          </div>
        `;
      }

      let sampleContent = '';
      if (isGenerator && (!ch.metadata || ch.metadata.length === 0)) {
        sampleContent = `<span class="text-neutral-400 italic">Generator Plugin</span>`;
      } else {
        const fullSourcePathHtml = isGenerator ? '' : `
            <strong class="font-semibold text-neutral-800 block mb-1 uppercase tracking-wide">Full Source Path</strong>
            <div class="mb-2 break-all">${samplePath}</div>
        `;

        sampleContent = `
          <details class="group">
            <summary class="cursor-pointer list-none flex items-center gap-1.5 hover:text-neutral-900 transition-colors">
              <svg class="w-3.5 h-3.5 ${isGenerator ? 'text-indigo-400' : 'text-neutral-400'} group-open:rotate-90 transition-transform flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
              </svg>
              <span class="truncate font-semibold ${isGenerator ? 'text-indigo-600 italic' : 'text-neutral-700'} max-w-[150px] sm:max-w-[250px] md:max-w-[350px]" title="${filename}">${filename}</span>
            </summary>
            <div class="mt-2.5 mb-1 pl-3 pr-2 py-2.5 bg-white border border-neutral-200 rounded-md text-[10px] text-neutral-500 shadow-sm relative overflow-hidden">
              <div class="absolute left-0 top-0 bottom-0 w-1 ${isGenerator ? 'bg-indigo-300' : 'bg-neutral-200'} rounded-l-md"></div>
              ${fullSourcePathHtml}
              ${metadataHtml}
            </div>
          </details>
        `;
      }

      row.innerHTML = `
        <td class="py-3 px-4 align-top text-center font-semibold text-neutral-500">${ch.index + 1}</td>
        <td class="py-3 px-4 align-top font-semibold text-neutral-900 truncate max-w-[176px]" title="${ch.name}">${ch.name}</td>
        <td class="py-3 px-4 align-top text-neutral-600 font-mono text-xs">
          ${sampleContent}
        </td>
        <td class="py-3 px-4 align-top text-center"><span class="inline-flex justify-center mt-0.5">${activeIcon}</span></td>
        <td class="py-3 px-4 align-top text-right text-neutral-700 font-mono"><span class="mt-0.5 block">${ch.volume}%</span></td>
        <td class="py-3 px-4 align-top text-right"><div class="mt-1.5">${panSlider}</div></td>
        <td class="py-3 px-4 align-top text-center">
          <button class="btn-play-channel w-6 h-6 inline-flex items-center justify-center rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 transition-colors" data-channel-idx="${ch.index}" title="Play Sample">
            ${PLAY_SVG}
          </button>
        </td>
      `;
      channelsList.appendChild(row);
    });

    // Channel delegation
    channelsList.addEventListener('click', (e) => {
      const target = e.target;

      const metadataRow = target.closest('.metadata-row');
      if (metadataRow) {
        const blobId = metadataRow.getAttribute('data-blob-id');
        if (blobId !== null) {
          const buffer = state.binaryBlobs[blobId];
          const blobName = metadataRow.getAttribute('data-name') || 'binary_data';
          const blob = new Blob([buffer], { type: 'application/octet-stream' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${blobName}.bin`;
          a.click();
          URL.revokeObjectURL(url);
          
          const originalHtml = metadataRow.innerHTML;
          metadataRow.innerHTML = `<div class="flex items-center justify-center w-full text-indigo-600 font-semibold text-xs py-0.5"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-3.5 h-3.5 mr-1"><path stroke-linecap="round" stroke-linejoin="round" d="m3 16.5 5.25 5.25m0 0 5.25-5.25m-5.25 5.25V3" /></svg>Downloaded .bin File</div>`;
          setTimeout(() => {
            metadataRow.innerHTML = originalHtml;
          }, 1500);
          return;
        }

        const key = metadataRow.getAttribute('data-key');
        const value = metadataRow.getAttribute('data-value');
        if (key !== null && value !== null) {
          let parsedValue = value;
          try { parsedValue = JSON.parse(value); } catch (e) {}

          const jsonStr = JSON.stringify({ [key]: parsedValue }, null, 2);
          navigator.clipboard.writeText(jsonStr).then(() => {
            const originalHtml = metadataRow.innerHTML;
            metadataRow.innerHTML = `<div class="flex items-center justify-center w-full text-emerald-600 font-semibold text-xs py-0.5"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-3.5 h-3.5 mr-1"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>Copied JSON</div>`;
            setTimeout(() => {
              metadataRow.innerHTML = originalHtml;
            }, 1200);
          }).catch(err => console.error('Failed to copy', err));
        }
        return;
      }

      const btn = target.closest('.btn-play-channel');
      if (btn) {
        const idx = parseInt(btn.getAttribute('data-channel-idx') || '-1');

        if (state.activeChannelSources[idx]) {
          try { state.activeChannelSources[idx].stop(); } catch (e) {}
          delete state.activeChannelSources[idx];
          btn.innerHTML = PLAY_SVG;
          btn.classList.remove('text-red-500');
          btn.classList.add('text-neutral-600');
          return;
        }

        const buffer = state.sampleBuffers[idx];
        if (buffer) {
          if (!state.audioCtx) {
            state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
          }
          if (state.audioCtx.state === 'suspended') {
            state.audioCtx.resume();
          }

          const source = state.audioCtx.createBufferSource();
          source.buffer = buffer;
          source.connect(state.audioCtx.destination);

          source.onended = () => {
            delete state.activeChannelSources[idx];
            btn.innerHTML = PLAY_SVG;
            btn.classList.remove('text-red-500');
            btn.classList.add('text-neutral-600');
          };

          source.start(0);
          state.activeChannelSources[idx] = source;

          btn.innerHTML = STOP_SVG;
          btn.classList.remove('text-neutral-600');
          btn.classList.add('text-red-500');
        } else {
          alert('No audio sample available for this channel (it might be a Generator or missing file).');
        }
      }
    });

    // Decode audio samples
    if (isZip && flp.files) {
      const decodeCtx = new (window.AudioContext || window.webkitAudioContext)();
      channels.forEach((ch) => {
        const sampleName = ch.samplePath;
        if (sampleName && sampleName !== 'Generator (No Sample)') {
          let matchedFileBuffer = null;
          if (flp.files[sampleName]) {
            matchedFileBuffer = flp.files[sampleName];
          } else {
            const basename = sampleName.split('\\').pop()?.split('/').pop();
            if (basename) {
              for (const [fname, bytes] of Object.entries(flp.files)) {
                if (fname === basename || fname.endsWith(`/${basename}`) || fname.endsWith(`\\${basename}`)) {
                  matchedFileBuffer = bytes;
                  break;
                }
              }
            }
          }

          if (matchedFileBuffer) {
            const arrayBuffer = matchedFileBuffer.buffer.slice(
              matchedFileBuffer.byteOffset,
              matchedFileBuffer.byteOffset + matchedFileBuffer.byteLength
            );

            try {
              decodeCtx.decodeAudioData(
                arrayBuffer,
                (decodedData) => { state.sampleBuffers[ch.index] = decodedData; },
                (e) => { console.warn(`[Audio Engine] Failed to decode audio for channel ${ch.index + 1}:`, e); }
              );
            } catch (e) {
              console.warn(`[Audio Engine] Sync error for channel ${ch.index + 1}:`, e);
            }
          }
        }
      });
    }
  }

  // Tracks
  tracksList.innerHTML = '';
  const trackEvents = flp.project.events.filter((e) => e.id === 238);
  tracksCountBadge.textContent = `${trackEvents.length} Tracks`;

  if (trackEvents.length === 0) {
    tracksList.innerHTML = `
      <tr>
        <td colspan="7" class="py-8 text-center text-neutral-400 italic">No track layout information found.</td>
      </tr>
    `;
  } else {
    trackEvents.forEach((evt) => {
      const track = evt.value;
      const row = document.createElement('tr');
      row.className = 'border-b border-neutral-100 hover:bg-neutral-50';

      const colorRgb = `rgb(${track.color.red}, ${track.color.green}, ${track.color.blue})`;
      const colorHex = '#' + [track.color.red, track.color.green, track.color.blue]
        .map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();

      row.innerHTML = `
        <td class="py-3 font-semibold text-neutral-900">Track ${track.idx + 1}</td>
        <td class="py-3 flex items-center space-x-2">
          <span class="w-4 h-4 rounded" style="background-color: ${colorRgb}"></span>
          <span class="text-xs font-mono text-neutral-500">${colorHex}</span>
        </td>
        <td class="py-3 text-neutral-600 font-mono">${track.icon === -1 ? 'None' : track.icon}</td>
        <td class="py-3 text-neutral-600">${track.height.toFixed(1)}</td>
        <td class="py-3">${renderBadge(track.enabled, 'Yes', 'No')}</td>
        <td class="py-3">${renderBadge(track.solo, 'Yes', 'No')}</td>
        <td class="py-3">${renderBadge(track.locked, 'Yes', 'No')}</td>
      `;
      tracksList.appendChild(row);
    });
  }

  // BPM
  const defaultBpm = flp.bpm;
  metaBpm.textContent = `${defaultBpm} BPM`;

  if (bpmInput) {
    bpmInput.value = String(defaultBpm);
  }

  // Patterns & Notes
  state.parsedPatterns = parsePatterns(flp.project.events);

  if (state.parsedPatterns.length === 0) {
    patternSelectorContainer.classList.add('hidden');
    pianoRollContainer.classList.add('hidden');
    notesCountBadge.textContent = '0 Notes';
    notesList.innerHTML = `
      <tr>
        <td colspan="7" class="py-8 text-center text-neutral-400 italic">No pattern MIDI notes found.</td>
      </tr>
    `;
  } else {
    patternSelectorContainer.classList.remove('hidden');

    state.selectedPatternIndex = state.parsedPatterns[0].index;
    state.selectedChannelRackIndex = -1;
    renderPatternSelectorButtons();
    renderActivePattern(state.parsedPatterns[0]);
  }

  // Raw Events
  eventsList.innerHTML = '';
  eventsCountBadge.textContent = `${flp.project.events.length} Events`;

  flp.project.events.slice(0, 200).forEach((evt, idx) => {
    const row = document.createElement('tr');
    row.className = 'border-b border-neutral-100 hover:bg-neutral-50';

    let valStr = '';
    if (typeof evt.value === 'string') {
      valStr = `"${evt.value}"`;
    } else if (evt.value && typeof evt.value === 'object' && !(evt.value instanceof Uint8Array)) {
      try {
        valStr = JSON.stringify(evt.value, (key, val) => {
          if (val instanceof Uint8Array || (val && val.buffer instanceof ArrayBuffer)) {
            return `[Binary Data: ${val.byteLength || val.length} bytes]`;
          }
          return val;
        });
      } catch (err) {
        valStr = '[Object too complex to display]';
      }
    } else if (evt.value instanceof Uint8Array) {
      if (evt.value.length <= 5000) {
        valStr = JSON.stringify(Array.from(evt.value));
      } else {
        valStr = `[Binary: ${evt.value.length} bytes (too large to copy)]`;
      }
    } else {
      valStr = String(evt.value);
    }

    row.innerHTML = `
      <td class="py-2 px-3 text-neutral-400">${idx}</td>
      <td class="py-2 px-3 font-semibold text-neutral-800">${evt.id}</td>
      <td class="py-2 px-3 text-neutral-900">${evt.name}</td>
      <td class="py-2 px-3"><span class="bg-neutral-100 px-1 py-0.5 rounded text-xs text-neutral-600 font-sans">${evt.type}</span></td>
      <td class="py-2 px-3 text-neutral-600 font-sans truncate max-w-xs" title="${valStr.replace(/"/g, '&quot;')}">${valStr}</td>
    `;
    eventsList.appendChild(row);
  });

  if (flp.project.events.length > 200) {
    const row = document.createElement('tr');
    row.innerHTML = `<td colspan="5" class="py-3 px-3 text-center text-neutral-400 text-xs italic">... and ${flp.project.events.length - 200} more events</td>`;
    eventsList.appendChild(row);
  }
}

function renderPatternSelectorButtons() {
  patternButtonsList.innerHTML = '';
  state.parsedPatterns.forEach((p) => {
    const btn = document.createElement('button');
    const isActive = p.index === state.selectedPatternIndex;
    btn.className = isActive
      ? 'text-xs bg-neutral-900 border border-neutral-900 text-white px-3 py-1 rounded-full font-medium transition-colors cursor-pointer shadow-sm'
      : 'text-xs bg-white border border-neutral-200 hover:bg-neutral-100 text-neutral-700 px-3 py-1 rounded-full font-medium transition-colors cursor-pointer';

    btn.textContent = `${p.name} (${p.notes.length} notes)`;
    btn.addEventListener('click', () => {
      state.selectedPatternIndex = p.index;
      renderPatternSelectorButtons();
      renderActivePattern(p);
    });
    patternButtonsList.appendChild(btn);
  });
}

function renderActivePattern(p) {
  state.currentNotes = p.notes;
  state.selectedChannelRackIndex = -1;
  renderChannelSelectorButtons();
  renderFilteredNotes();
}

function renderChannelSelectorButtons() {
  channelButtonsList.innerHTML = '';

  const rackIndices = Array.from(new Set(state.currentNotes.map((n) => n.rack))).sort((a, b) => a - b);

  if (rackIndices.length <= 1) {
    channelSelectorContainer.classList.add('hidden');
    return;
  }

  channelSelectorContainer.classList.remove('hidden');

  const allBtn = document.createElement('button');
  const isAllActive = state.selectedChannelRackIndex === -1;
  allBtn.className = isAllActive
    ? 'text-xs bg-neutral-900 border border-neutral-900 text-white px-3 py-1 rounded-full font-medium transition-colors cursor-pointer shadow-sm'
    : 'text-xs bg-white border border-neutral-200 hover:bg-neutral-100 text-neutral-700 px-3 py-1 rounded-full font-medium transition-colors cursor-pointer';
  allBtn.textContent = `All Channels (${state.currentNotes.length} notes)`;
  allBtn.addEventListener('click', () => {
    state.selectedChannelRackIndex = -1;
    renderChannelSelectorButtons();
    renderFilteredNotes();
  });
  channelButtonsList.appendChild(allBtn);

  rackIndices.forEach((rackIdx) => {
    const channel = state.currentChannels.find((c) => c.index === rackIdx);
    const channelName = channel ? channel.name : `Rack Item #${rackIdx}`;
    const noteCount = state.currentNotes.filter((n) => n.rack === rackIdx).length;

    const btn = document.createElement('button');
    const isActive = state.selectedChannelRackIndex === rackIdx;
    btn.className = isActive
      ? 'text-xs bg-neutral-900 border border-neutral-900 text-white px-3 py-1 rounded-full font-medium transition-colors cursor-pointer shadow-sm'
      : 'text-xs bg-white border border-neutral-200 hover:bg-neutral-100 text-neutral-700 px-3 py-1 rounded-full font-medium transition-colors cursor-pointer';

    btn.textContent = `${channelName} (${noteCount} notes)`;
    btn.addEventListener('click', () => {
      state.selectedChannelRackIndex = rackIdx;
      renderChannelSelectorButtons();
      renderFilteredNotes();
    });
    channelButtonsList.appendChild(btn);
  });
}

function renderFilteredNotes() {
  const filteredNotes = state.selectedChannelRackIndex === -1
    ? state.currentNotes
    : state.currentNotes.filter((n) => n.rack === state.selectedChannelRackIndex);

  notesCountBadge.textContent = `${filteredNotes.length} Notes`;
  pianoRollContainer.classList.remove('hidden');

  setTimeout(() => {
    drawPianoRoll(filteredNotes, state.currentPPQ);
  }, 0);

  notesList.innerHTML = '';
  filteredNotes.slice(0, 300).forEach((note, idx) => {
    const row = document.createElement('tr');
    row.className = 'border-b border-neutral-100 hover:bg-neutral-50';

    const channel = state.currentChannels.find((c) => c.index === note.rack);
    const channelName = channel ? channel.name : `Rack Item #${note.rack}`;

    let sampleFilenameHtml = '<span class="text-neutral-400 italic text-[10px]">Generator</span>';
    if (channel && channel.samplePath && channel.samplePath !== 'Generator (No Sample)') {
      const pathParts = channel.samplePath.split(/[\\\/]/);
      sampleFilenameHtml = pathParts[pathParts.length - 1];
    }

    const colorScheme = RACK_COLORS[note.rack % RACK_COLORS.length];
    const badgeColor = colorScheme.stroke;

    row.innerHTML = `
      <td class="py-2 text-neutral-500 text-xs font-mono">Note ${idx + 1}</td>
      <td class="py-2 text-neutral-800 font-semibold text-xs sm:text-sm">
        <span class="inline-flex items-center space-x-1.5">
          <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" style="background-color: ${badgeColor}"></span>
          <span class="truncate max-w-[100px] sm:max-w-[160px]" title="${channelName}">${channelName}</span>
        </span>
      </td>
      <td class="py-2 text-neutral-600 font-mono text-[10px] sm:text-xs truncate max-w-[120px] sm:max-w-[180px]">${sampleFilenameHtml}</td>
      <td class="py-2 text-neutral-600 font-mono text-xs">${note.position}</td>
      <td class="py-2 text-neutral-600 font-mono text-xs">${note.duration}</td>
      <td class="py-2 text-neutral-800 font-bold text-xs sm:text-sm">${getNoteName(note.key)}</td>
      <td class="py-2 text-neutral-600 font-mono text-xs">${note.velocity}</td>
      <td class="py-2 text-neutral-600 font-mono text-xs">${note.midiChannel}</td>
    `;
    notesList.appendChild(row);
  });

  if (filteredNotes.length > 300) {
    const row = document.createElement('tr');
    row.innerHTML = `<td colspan="7" class="py-3 text-center text-neutral-400 text-xs italic">... showing first 300 notes out of ${filteredNotes.length} total</td>`;
    notesList.appendChild(row);
  }
}
