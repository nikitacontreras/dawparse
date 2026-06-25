export const $ = id => document.getElementById(id);

export const dropzone = $('dropzone');
export const fileInput = $('file-input');
export const statusContainer = $('status-container');
export const loadingSpinner = $('loading-spinner');
export const errorAlert = $('error-alert');
export const errorMessage = $('error-message');
export const dashboard = $('dashboard');

export const metaFileType = $('meta-file-type');
export const metaBpm = $('meta-bpm');
export const metaChannels = $('meta-channels');
export const metaPpq = $('meta-ppq');
export const metaEventsCount = $('meta-events-count');

export const detailFlpName = $('detail-flp-name');
export const detailMagic = $('detail-magic');
export const detailHeaderSize = $('detail-header-size');
export const detailFormat = $('detail-format');

export const zipFilesContainer = $('zip-files-container');
export const flpSamplesContainer = $('flp-samples-container');
export const flpSamplesList = $('flp-samples-list');
export const rawFlpOnlyMsg = $('raw-flp-only-msg');
export const zipFilesList = $('zip-files-list');

export const channelsList = $('channels-list');
export const channelsCountBadge = $('channels-count-badge');

export const tracksList = $('tracks-list');
export const tracksCountBadge = $('tracks-count-badge');

export const notesList = $('notes-list');
export const notesCountBadge = $('notes-count-badge');

export const pianoRollCanvas = $('piano-roll-canvas');
export const pianoRollInfo = $('piano-roll-info');
export const pianoRollContainer = $('piano-roll-container');
export const patternSelectorContainer = $('pattern-selector-container');
export const patternButtonsList = $('pattern-buttons-list');
export const channelSelectorContainer = $('channel-selector-container');
export const channelButtonsList = $('channel-buttons-list');

export const btnPlayPreview = $('btn-play-preview');
export const btnPausePreview = $('btn-pause-preview');
export const btnStopPreview = $('btn-stop-preview');
export const textPause = $('text-pause');
export const iconPause = $('icon-pause');

export const eventsList = $('events-list');
export const eventsCountBadge = $('events-count-badge');

export const bpmInput = $('input-preview-bpm');

export const state = {
  currentNotes: [],
  currentPPQ: 96,
  currentChannels: [],
  parsedPatterns: [],
  selectedPatternIndex: -1,
  selectedChannelRackIndex: -1,
  currentMaxEnd: 0,
  sampleBuffers: {},
  activeChannelSources: {},
  audioCtx: null,
  activeOscillators: [],
  activeSampleSources: [],
  isPlaying: false,
  playStartTime: 0,
  playAnimationId: null,
  binaryBlobs: {},
};
