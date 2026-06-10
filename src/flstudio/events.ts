export const S_BYTE = 0;
export const S_WORD = 64;
export const S_DWORD = 128;
export const S_DATA = 192;

export const EVENT_NAMES: Record<number, string> = {
  0: 'Is Channel Enabled',
  2: 'Channel Volume (Byte)',
  3: 'Channel Panning (Byte)',
  9: 'Project Loop Active',
  10: 'Show Project Info',
  11: 'Rack Swing',
  12: 'Project Volume *',
  13: 'Fit Rack To Steps',
  15: 'Is Channel Zipped',
  17: 'Time Signature Numerator',
  18: 'Time Signature Denominator',
  20: 'Is Channel Ping Pong Loop Enabled',
  21: 'Channel Type',
  22: 'Channel Routed To',
  23: 'Project Pan Law',
  26: 'Pattern Looped',
  28: 'Project Licensed',
  29: 'Mixer APDC',
  30: 'Patterns Should Play Truncated Notes',
  32: 'Is Channel Locked',
  33: 'Time Marker Numerator',
  34: 'Time Marker Denominator',
  64: 'New Channel',
  65: 'New Pattern',
  66: 'Project Coarse Tempo *',
  67: 'Currently Selected Patterns',
  69: 'Channel Frequency Tilt',
  70: 'Channel FX Flags',
  71: 'Channel Cutoff',
  72: 'Channel Volume (Word)',
  73: 'Channel Panning (Word)',
  74: 'Channel Preamp',
  75: 'Channel Fade Out',
  76: 'Channel Fade In',
  77: 'Dot Note *',
  78: 'Dot Pitch *',
  79: 'Dot Mix *',
  80: 'Project Global Pitch',
  83: 'Channel Resonance',
  84: 'Loop Bar *',
  85: 'Channel Stereo Delay',
  86: 'Channel Pogo',
  87: 'Dot Resonance *',
  88: 'Dot Cutoff *',
  89: 'Channel Time Shift',
  91: 'Dot *',
  92: 'Dot Shift *',
  93: 'Project Fine Tempo *',
  94: 'Channel Children',
  95: 'Insert Icon',
  96: 'Dot Release *',
  97: 'Channel Swing',
  98: 'Slot Index',
  99: 'New Arrangement',
  100: 'Current Arrangement',
  128: 'Plugin Color',
  130: 'Channel Echo *',
  131: 'Channel Ring Modulation',
  132: 'Channel Cut Group', // Special structure: cutGroup and cutBy
  133: 'Rack Window Height',
  135: 'Channel Root Note',
  136: 'Channel Stretch Time',
  138: 'Channel Fine Tune',
  139: 'Sampler Flags',
  140: 'Layer Flags',
  141: 'Channel Group Number',
  144: 'Layer Flags',
  146: 'Current Group ID',
  147: 'Insert Output',
  148: 'Time Marker Position',
  149: 'Insert Color',
  150: 'Pattern Color',
  152: 'Arrangement Loop Position',
  153: 'AU Sample Rate',
  154: 'Insert Input',
  155: 'Plugin Icon',
  156: 'Project Tempo',
  159: 'FL Studio Build',
  160: 'Pattern Channel ID',
  161: 'Channel Loop',
  162: 'Pattern Loop',
  164: 'Pattern Length',
  192: 'Channel Name',
  193: 'Pattern Name',
  194: 'Project Title',
  195: 'Project Comments',
  196: 'Channel Sample Path',
  197: 'Project URL',
  198: 'RTF Comments *',
  199: 'FL Studio Version',
  200: 'Licensee',
  201: 'Plugin Internal Name',
  202: 'Project Data Path',
  203: 'Plugin Name',
  204: 'Insert Name',
  205: 'Time Marker Name',
  206: 'Project Genre',
  207: 'Project Artists',
  209: 'Channel Delay',
  212: 'Plugin Wrapper',
  215: 'Channel Parameters',
  217: 'Playlist Selection',
  218: 'Channel Envelope LFO',
  219: 'Channel Levels',
  220: 'Channel Filter *',
  221: 'Channel Polyphony',
  223: 'Pattern Controllers',
  224: 'Pattern Notes',
  225: 'Mixer Parameters',
  226: 'MIDI Controller',
  227: 'Remote Controller',
  228: 'Channel Tracking',
  229: 'Channel Level Adjusts',
  231: 'Display Group Name',
  233: 'Arrangement Playlist',
  234: 'Channel Automation',
  235: 'Insert Routing',
  236: 'Insert Flags',
  237: 'Project Timestamp',
  238: 'Track Data',
  239: 'Track Name',
  241: 'Arrangement Name',
};

export function getEventName(id: number): string {
  return EVENT_NAMES[id] || `Unknown Event (${id})`;
}

export function getEventType(id: number): 'byte' | 'word' | 'dword' | 'data' | 'cutGroup' {
  if (id === 132) {
    return 'cutGroup';
  }
  if (id < S_WORD) {
    return 'byte';
  }
  if (id < S_DWORD) {
    return 'word';
  }
  if (id < S_DATA) {
    return 'dword';
  }
  return 'data';
}

// Set of events that are strings
export const STRING_EVENT_IDS = new Set<number>([
  192, 193, 194, 195, 196, 197, 198, 199, 200, 201, 202, 203, 204, 205, 206, 207, 239, 241,
]);

export function isStringEvent(id: number): boolean {
  return STRING_EVENT_IDS.has(id);
}
