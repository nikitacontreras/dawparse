import { BufferReader } from '../shared/reader.js';
import { BufferWriter } from '../shared/writer.js';

export interface FieldDescriptor {
  name: string;
  type: 'int8' | 'uint8' | 'int16' | 'uint16' | 'int32' | 'uint32' | 'float32' | 'float64';
  optional?: boolean;
  default?: number;
}

const FIELD_SIZES: Record<FieldDescriptor['type'], number> = {
  int8: 1, uint8: 1,
  int16: 2, uint16: 2,
  int32: 4, uint32: 4,
  float32: 4, float64: 8,
};

type ReaderMethod = (reader: BufferReader) => number;

const FIELD_READERS: Record<FieldDescriptor['type'], ReaderMethod> = {
  int8: (r) => r.readInt8(),
  uint8: (r) => r.readUint8(),
  int16: (r) => r.readInt16(),
  uint16: (r) => r.readUint16(),
  int32: (r) => r.readInt32(),
  uint32: (r) => r.readUint32(),
  float32: (r) => r.readFloat32(),
  float64: (r) => r.readFloat64(),
};

export function readStruct<T>(reader: BufferReader, fields: FieldDescriptor[]): T {
  const result = {} as Record<string, unknown>;
  for (const field of fields) {
    const size = FIELD_SIZES[field.type];
    if (field.optional && reader.remaining < size) {
      result[field.name] = field.default ?? 0;
      continue;
    }
    result[field.name] = FIELD_READERS[field.type](reader);
  }
  return result as unknown as T;
}

export function writeStruct(writer: BufferWriter, fields: FieldDescriptor[], value: unknown) {
  const valObj = value as Record<string, unknown>;
  for (const field of fields) {
    const val = valObj[field.name];
    if (val === undefined) {
      throw new Error(`Missing field "${field.name}" during serialization`);
    }
    switch (field.type) {
      case 'int8':
        writer.writeInt8(val as number);
        break;
      case 'uint8':
        writer.writeUint8(val as number);
        break;
      case 'int16':
        writer.writeInt16(val as number);
        break;
      case 'uint16':
        writer.writeUint16(val as number);
        break;
      case 'int32':
        writer.writeInt32(val as number);
        break;
      case 'uint32':
        writer.writeUint32(val as number);
        break;
      case 'float32':
        writer.writeFloat32(val as number);
        break;
      case 'float64':
        writer.writeFloat64(val as number);
        break;
    }
  }
}

// Known valid payload sizes per event ID (some events vary by FL version)
export const KNOWN_SIZES: Record<number, number[]> = {
  209: [20],   // Channel Delay
  212: [52],   // Plugin Wrapper
  215: [157, 168], // Channel Parameters (157 = FL ≤20.8.4, 168 = FL ≥20.9.1)
  218: [68],   // Channel Envelope LFO
  219: [24],   // Channel Levels
  221: [9],    // Channel Polyphony
  227: [18],   // Remote Controller
  228: [16],   // Channel Tracking
  229: [20],   // Channel Level Adjusts
  238: [66],   // Track Data
};

export const ChannelDelayFields: FieldDescriptor[] = [
  { name: 'feedback', type: 'int32' },
  { name: 'pan', type: 'int32' },
  { name: 'pitchShift', type: 'int32' },
  { name: 'echoes', type: 'int32' },
  { name: 'time', type: 'int32' },
];

export const PluginWrapperFields: FieldDescriptor[] = [
  { name: 'mixerInsert', type: 'int32' },
  { name: 'mixerSlot', type: 'int32' },
  { name: 'u1', type: 'int32' },
  { name: 'u2', type: 'int32' },
  { name: 'flags', type: 'uint32' },
  { name: 'page', type: 'uint32' },
  { name: 'u3', type: 'int32' },
  { name: 'u4', type: 'int32' },
  { name: 'u5', type: 'int32' },
  { name: 'x', type: 'int32' },
  { name: 'y', type: 'int32' },
  { name: 'width', type: 'uint32' },
  { name: 'height', type: 'uint32' },
];

export const ChannelParametersCoreFields: FieldDescriptor[] = [
  { name: 'simSynthTempo', type: 'int32' },
  { name: 'spectrumView', type: 'uint8' },
  { name: 'multiChannelWaveformView', type: 'uint8' },
  { name: 'u1', type: 'int16' },
  { name: 'useRiff', type: 'uint8' },
  { name: 'removeDc', type: 'uint8' },
  { name: 'delayFlags', type: 'uint8' },
  { name: 'keyboardPitch', type: 'uint8' },
  { name: 'simSynthKeyboardPitch', type: 'int32' },
  { name: 'drumSynthKeyboardPitch', type: 'int32' },
  { name: 'tone', type: 'float32' },
  { name: 'overtone', type: 'float32' },
  { name: 'noise', type: 'float32' },
  { name: 'noiseBand', type: 'float32' },
  { name: 'timeStretch', type: 'float32' },
  { name: 'arpDirection', type: 'int32' },
  { name: 'arpRange', type: 'int32' },
  { name: 'arpChord', type: 'int32' },
  { name: 'arpTime', type: 'int32' },
  { name: 'arpGate', type: 'int32' },
  { name: 'arpSlide', type: 'uint8' },
  { name: 'u2', type: 'uint8' },
  { name: 'fullPorta', type: 'uint8' },
  { name: 'addRoot', type: 'uint8' },
  { name: 'timeGate', type: 'int16' },
  { name: 'u3', type: 'int16' },
  { name: 'keyRegionMin', type: 'int32' },
  { name: 'keyRegionMax', type: 'int32' },
  { name: 'layerCrossfade', type: 'int32' },
  { name: 'normalize', type: 'uint8' },
  { name: 'inverted', type: 'uint8' },
  { name: 'u4', type: 'uint8' },
  { name: 'declickMode', type: 'uint8' },
  { name: 'crossfade', type: 'int32' },
  { name: 'trim', type: 'int32' },
  { name: 'arpRepeat', type: 'int32' },
  { name: 'stretchTime', type: 'int32' },
  { name: 'stretchPitch', type: 'int32' },
  { name: 'stretchMultiplier', type: 'int32' },
  { name: 'stretchMode', type: 'int32' },
  // u5 is a 4×int32 array handled explicitly in the parser
  { name: 'fxStart', type: 'float64' },
  { name: 'fxEnd', type: 'float64' },
  { name: 'u6', type: 'int32' },
  { name: 'playbackStart', type: 'float32' },
  { name: 'u7', type: 'int32' },
  { name: 'reverseRegions', type: 'uint8' },
];

export const ChannelParametersTailFields: FieldDescriptor[] = [
  { name: 'fixTrim', type: 'uint8', optional: true, default: 0 },
  { name: 'u8', type: 'int16', optional: true, default: 0 },
  { name: 'formantShift', type: 'float64', optional: true, default: 0 },
];

export const ChannelEnvelopeLFOFields: FieldDescriptor[] = [
  { name: 'flags', type: 'int32' },
  { name: 'envelopeEnabled', type: 'int32' },
  { name: 'envelopePredelay', type: 'int32' },
  { name: 'envelopeAttack', type: 'int32' },
  { name: 'envelopeHold', type: 'int32' },
  { name: 'envelopeDecay', type: 'int32' },
  { name: 'envelopeSustain', type: 'int32' },
  { name: 'envelopeRelease', type: 'int32' },
  { name: 'envelopeAmount', type: 'int32' },
  { name: 'lfoPredelay', type: 'int32' },
  { name: 'lfoAttack', type: 'int32' },
  { name: 'lfoAmount', type: 'int32' },
  { name: 'lfoSpeed', type: 'int32' },
  { name: 'lfoShape', type: 'int32' },
  { name: 'envelopeAttackTension', type: 'int32' },
  { name: 'envelopeDecayTension', type: 'int32' },
  { name: 'envelopeReleaseTension', type: 'int32' },
];

export const ChannelLevelsFields: FieldDescriptor[] = [
  { name: 'pan', type: 'int32' },
  { name: 'volume', type: 'int32' },
  { name: 'pitch', type: 'int32' },
  { name: 'modX', type: 'int32' },
  { name: 'modY', type: 'int32' },
  { name: 'filterType', type: 'int32' },
];

export const ChannelPolyphonyFields: FieldDescriptor[] = [
  { name: 'max', type: 'int32' },
  { name: 'slide', type: 'int32' },
  { name: 'type', type: 'uint8' },
];

export const NoteFields: FieldDescriptor[] = [
  { name: 'position', type: 'uint32' },
  { name: 'flags', type: 'uint16' },
  { name: 'rack', type: 'uint16' },
  { name: 'duration', type: 'uint32' },
  { name: 'key', type: 'uint16' },
  { name: 'group', type: 'int16' },
  { name: 'pitch', type: 'int16' },
  { name: 'release', type: 'uint8' },
  { name: 'midiChannel', type: 'uint8' },
  { name: 'pan', type: 'uint8' },
  { name: 'velocity', type: 'uint8' },
  { name: 'modX', type: 'uint8' },
  { name: 'modY', type: 'uint8' },
];

export const MixerParamFields: FieldDescriptor[] = [
  { name: 'u1', type: 'int32' },
  { name: 'paramId', type: 'uint8' },
  { name: 'u2', type: 'uint8' },
  { name: 'bitfield', type: 'uint16' },
  { name: 'data', type: 'uint32' },
];

export const RemoteControllerFields: FieldDescriptor[] = [
  { name: 'internalParam', type: 'uint16' },
  { name: 'automationChannel', type: 'int32' },
  { name: 'u1', type: 'uint16' },
  { name: 'targetParam', type: 'uint16' },
  { name: 'generatorChannel', type: 'uint16' },
  { name: 'params', type: 'uint32' },
  { name: 'smoothingFactor', type: 'uint32' },
];

export const ChannelTrackingFields: FieldDescriptor[] = [
  { name: 'mid', type: 'int32' },
  { name: 'pan', type: 'int32' },
  { name: 'modX', type: 'int32' },
  { name: 'modY', type: 'int32' },
];

export const ChannelLevelAdjustsFields: FieldDescriptor[] = [
  { name: 'pan', type: 'int32' },
  { name: 'volume', type: 'int32' },
  { name: 'pitch', type: 'int32' },
  { name: 'modX', type: 'int32' },
  { name: 'modY', type: 'int32' },
];

export const AutomationPointFields: FieldDescriptor[] = [
  { name: 'delta', type: 'float64' },
  { name: 'value', type: 'float64' },
  { name: 'tension', type: 'float32' },
  { name: 'tensionType', type: 'uint16' },
  { name: 'isSelected', type: 'uint8' },
  { name: 'tensionSign', type: 'int8' },
];

export const AutomationHeaderFields: FieldDescriptor[] = [
  { name: 'version', type: 'int32' },
  { name: 'lfoAmount', type: 'int32' },
  { name: 'dontMultiplyEnvelopeLevel', type: 'uint8' },
  { name: 'u1', type: 'int32' },
  { name: 'u2', type: 'int32' },
  { name: 'numPoints', type: 'int32' },
];

export const AutomationFooterFields: FieldDescriptor[] = [
  { name: 'lfoSpeed', type: 'int32' },
  { name: 'lfoTension', type: 'int32' },
  { name: 'lfoSkew', type: 'int32' },
  { name: 'lfoPulseWidth', type: 'int32' },
  { name: 'lfoOffset', type: 'float32' },
];

export const TrackDataFields: FieldDescriptor[] = [
  { name: 'idx', type: 'int32' },
  { name: 'red', type: 'uint8' },
  { name: 'green', type: 'uint8' },
  { name: 'blue', type: 'uint8' },
  { name: 'unused', type: 'uint8' },
  { name: 'icon', type: 'int32' },
  { name: 'enabled', type: 'uint8' },
  { name: 'height', type: 'float32' },
  { name: 'lockedHeight', type: 'int32' },
  { name: 'contentLocked', type: 'uint8' },
  { name: 'motion', type: 'int32' },
  { name: 'press', type: 'int32' },
  { name: 'triggerSync', type: 'int32' },
  { name: 'queued', type: 'uint32' },
  { name: 'tolerant', type: 'uint32' },
  { name: 'positionSync', type: 'int32' },
  { name: 'grouped', type: 'uint8' },
  { name: 'locked', type: 'uint8' },
  { name: 'solo', type: 'uint8' },
  { name: 'trackMode', type: 'int32' },
  { name: 'targetAudioChannel', type: 'int32' },
  { name: 'targetInstChannel', type: 'int32' },
  { name: 'expanded', type: 'uint8' },
  { name: 'instTrackEditMode', type: 'int32' },
];
