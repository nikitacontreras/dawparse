export interface FLPHeader {
  magic: 'FLhd';
  headerSize: number;
  fmt: number;
  channelCount: number;
  ppq: number;
  dataMagic: 'FLdt';
  eventSize: number;
}

export interface Color {
  red: number;
  green: number;
  blue: number;
}

export interface AutomationPoint {
  delta: number;
  value: number;
  tension: number;
  tensionType: number;
  isSelected: number;
  tensionSign: number;
}

export interface Note {
  position: number;
  flags: number;
  rack: number;
  duration: number;
  key: number;
  group: number;
  pitch: number;
  release: number;
  midiChannel: number;
  pan: number;
  velocity: number;
  modX: number;
  modY: number;
}

export interface MixerParam {
  u1: number;
  paramId: number;
  u2: number;
  slot: number;
  insert: number;
  type: number;
  data: number;
}

export interface TrackData {
  idx: number;
  color: Color;
  icon: number;
  enabled: number;
  height: number;
  lockedHeight: number;
  contentLocked: number;
  motion: number;
  press: number;
  triggerSync: number;
  queued: number;
  tolerant: number;
  positionSync: number;
  grouped: number;
  locked: number;
  solo: number;
  trackMode: number;
  targetAudioChannel: number;
  targetInstChannel: number;
  expanded: number;
  instTrackEditMode: number;
}

export interface ChannelDelay {
  feedback: number;
  pan: number;
  pitchShift: number;
  echoes: number;
  time: number;
}

export interface PluginWrapper {
  mixerInsert: number;
  mixerSlot: number;
  u1: number;
  u2: number;
  flags: number;
  page: number;
  u3: number;
  u4: number;
  u5: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ChannelParameters {
  simSynthTempo: number;
  spectrumView: number;
  multiChannelWaveformView: number;
  u1: number;
  useRiff: number;
  removeDc: number;
  delayFlags: number;
  keyboardPitch: number;
  simSynthKeyboardPitch: number;
  drumSynthKeyboardPitch: number;
  tone: number;
  overtone: number;
  noise: number;
  noiseBand: number;
  timeStretch: number;
  arpDirection: number;
  arpRange: number;
  arpChord: number;
  arpTime: number;
  arpGate: number;
  arpSlide: number;
  u2: number;
  fullPorta: number;
  addRoot: number;
  timeGate: number;
  u3: number;
  keyRegionMin: number;
  keyRegionMax: number;
  layerCrossfade: number;
  normalize: number;
  inverted: number;
  u4: number;
  declickMode: number;
  crossfade: number;
  trim: number;
  arpRepeat: number;
  stretchTime: number;
  stretchPitch: number;
  stretchMultiplier: number;
  stretchMode: number;
  u5: number[]; // size 4
  fxStart: number;
  fxEnd: number;
  u6: number;
  playbackStart: number;
  u7: number;
  reverseRegions: number;
  fixTrim: number;
  u8: number;
  formantShift: number;
}

export interface ChannelEnvelopeLFO {
  flags: number;
  envelopeEnabled: number;
  envelopePredelay: number;
  envelopeAttack: number;
  envelopeHold: number;
  envelopeDecay: number;
  envelopeSustain: number;
  envelopeRelease: number;
  envelopeAmount: number;
  lfoPredelay: number;
  lfoAttack: number;
  lfoAmount: number;
  lfoSpeed: number;
  lfoShape: number;
  envelopeAttackTension: number;
  envelopeDecayTension: number;
  envelopeReleaseTension: number;
}

export interface ChannelLevels {
  pan: number;
  volume: number;
  pitch: number;
  modX: number;
  modY: number;
  filterType: number;
}

export interface ChannelPolyphony {
  max: number;
  slide: number;
  type: 0 | 1 | 2; // None=0, Mono=1, Porta=2
}

export interface RemoteController {
  internalParam: number;
  automationChannel: number;
  u1: number;
  targetParam: number;
  generatorChannel: number;
  params: number;
  smoothingFactor: number;
}

export interface ChannelTracking {
  mid: number;
  pan: number;
  modX: number;
  modY: number;
}

export interface ChannelLevelAdjusts {
  pan: number;
  volume: number;
  pitch: number;
  modX: number;
  modY: number;
}

export interface ChannelAutomation {
  version: number;
  lfoAmount: number;
  dontMultiplyEnvelopeLevel: number;
  u1: number;
  u2: number;
  numPoints: number;
  points: AutomationPoint[];
  unknown1: Uint8Array; // size 44
  numLFOPoints: number;
  lfoPoints: AutomationPoint[];
  unknown2: Uint8Array; // size 20
  lfoSpeed: number;
  lfoTension: number;
  lfoSkew: number;
  lfoPulseWidth: number;
  lfoOffset: number;
}

export interface CutGroupEvent {
  cutGroup: number;
  cutBy: number;
}

export interface FLPEvent {
  id: number;
  name: string;
  type: 'byte' | 'word' | 'dword' | 'data' | 'cutGroup';
  value:
    | number
    | string
    | Uint8Array
    | CutGroupEvent
    | ChannelDelay
    | PluginWrapper
    | ChannelParameters
    | ChannelEnvelopeLFO
    | ChannelLevels
    | ChannelPolyphony
    | Note[]
    | MixerParam[]
    | RemoteController
    | ChannelTracking
    | ChannelLevelAdjusts
    | ChannelAutomation
    | TrackData;
}

export interface FLPProject {
  header: FLPHeader;
  events: FLPEvent[];
}
