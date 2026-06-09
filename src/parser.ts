import { getEventName, getEventType, isStringEvent } from './events.js';
import {
  FLPProject,
  FLPHeader,
  FLPEvent,
  Color,
  AutomationPoint,
  Note,
  MixerParam,
  TrackData,
  ChannelDelay,
  PluginWrapper,
  ChannelParameters,
  ChannelEnvelopeLFO,
  ChannelLevels,
  ChannelPolyphony,
  RemoteController,
  ChannelTracking,
  ChannelLevelAdjusts,
  ChannelAutomation,
  CutGroupEvent
} from './types.js';

function readVarInt(data: Uint8Array, state: { offset: number }): number {
  let value = 0;
  let i = 0;
  while (true) {
    if (state.offset >= data.length) {
      throw new Error('Unexpected end of data while reading VarInt');
    }
    const b = data[state.offset++];
    value |= (b & 0x7f) << (7 * i);
    if (!(b & 0x80)) {
      break;
    }
    i++;
  }
  return value;
}

export function parseFLP(data: Uint8Array): FLPProject {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const state = { offset: 0 };

  // Helper to read ASCII string of length N
  const readString = (len: number): string => {
    let str = '';
    for (let i = 0; i < len; i++) {
      if (state.offset >= data.length) {
        throw new Error('Unexpected end of file while reading string');
      }
      str += String.fromCharCode(data[state.offset++]);
    }
    return str;
  };

  // Parse FLhd header
  if (data.length < 22) {
    throw new Error('File is too small to contain a valid FLP header');
  }

  const magic = readString(4);
  if (magic !== 'FLhd') {
    throw new Error(`Invalid FLP magic header: expected "FLhd", got "${magic}"`);
  }

  const headerSize = view.getInt32(state.offset, true);
  state.offset += 4;

  const fmt = view.getInt16(state.offset, true);
  state.offset += 2;

  const channelCount = view.getInt16(state.offset, true);
  state.offset += 2;

  const ppq = view.getInt16(state.offset, true);
  state.offset += 2;

  const dataMagic = readString(4);
  if (dataMagic !== 'FLdt') {
    throw new Error(`Invalid FLP data magic: expected "FLdt", got "${dataMagic}"`);
  }

  const eventSize = view.getInt32(state.offset, true);
  state.offset += 4;

  const header: FLPHeader = {
    magic,
    headerSize,
    fmt,
    channelCount,
    ppq,
    dataMagic,
    eventSize,
  };

  const events: FLPEvent[] = [];

  // Parse events until EOF
  // Note: the header.eventSize specifies the size of the data chunk,
  // but to be robust we just read until the end of the buffer or eventSize limit.
  const endOffset = Math.min(data.length, state.offset + eventSize);

  while (state.offset < endOffset) {
    const id = data[state.offset++];
    const name = getEventName(id);
    const type = getEventType(id);

    let value: FLPEvent['value'];

    switch (type) {
      case 'byte': {
        value = view.getInt8(state.offset);
        state.offset += 1;
        break;
      }
      case 'word': {
        value = view.getInt16(state.offset, true);
        state.offset += 2;
        break;
      }
      case 'cutGroup': {
        const cutGroup = view.getInt16(state.offset, true);
        state.offset += 2;
        const cutBy = view.getInt16(state.offset, true);
        state.offset += 2;
        value = { cutGroup, cutBy } as CutGroupEvent;
        break;
      }
      case 'dword': {
        value = view.getInt32(state.offset, true);
        state.offset += 4;
        break;
      }
      case 'data': {
        const length = readVarInt(data, state);
        if (state.offset + length > data.length) {
          throw new Error(`Event ID ${id} data size ${length} exceeds file bounds`);
        }
        const payload = data.subarray(state.offset, state.offset + length);
        state.offset += length;

        value = parseStructuredData(id, payload);
        break;
      }
      default:
        throw new Error(`Unknown event type for ID ${id}`);
    }

    events.push({
      id,
      name,
      type,
      value,
    });
  }

  return { header, events };
}

function parseStructuredData(id: number, payload: Uint8Array): FLPEvent['value'] {
  if (isStringEvent(id)) {
    const decoder = new TextDecoder('utf-8');
    let str = decoder.decode(payload);
    // Remove trailing null bytes if present
    if (str.endsWith('\0')) {
      str = str.slice(0, -1);
    }
    return str;
  }

  const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
  let offset = 0;

  switch (id) {
    case 209: { // Channel Delay
      if (payload.length < 20) return payload;
      const feedback = view.getInt32(0, true);
      const pan = view.getInt32(4, true);
      const pitchShift = view.getInt32(8, true);
      const echoes = view.getInt32(12, true);
      const time = view.getInt32(16, true);
      return { feedback, pan, pitchShift, echoes, time } as ChannelDelay;
    }
    case 212: { // Plugin Wrapper
      if (payload.length < 52) return payload;
      const mixerInsert = view.getInt32(0, true);
      const mixerSlot = view.getInt32(4, true);
      const u1 = view.getInt32(8, true);
      const u2 = view.getInt32(12, true);
      const flags = view.getUint32(16, true);
      const page = view.getUint32(20, true);
      const u3 = view.getInt32(24, true);
      const u4 = view.getInt32(28, true);
      const u5 = view.getInt32(32, true);
      const x = view.getInt32(36, true);
      const y = view.getInt32(40, true);
      const width = view.getUint32(44, true);
      const height = view.getUint32(48, true);
      return { mixerInsert, mixerSlot, u1, u2, flags, page, u3, u4, u5, x, y, width, height } as PluginWrapper;
    }
    case 215: { // Channel Parameters
      if (payload.length < 168) return payload;
      const simSynthTempo = view.getInt32(0, true);
      const spectrumView = view.getUint8(4);
      const multiChannelWaveformView = view.getUint8(5);
      const u1 = view.getInt16(6, true);
      const useRiff = view.getUint8(8);
      const removeDc = view.getUint8(9);
      const delayFlags = view.getUint8(10);
      const keyboardPitch = view.getUint8(11);
      const simSynthKeyboardPitch = view.getInt32(12, true);
      const drumSynthKeyboardPitch = view.getInt32(16, true);
      const tone = view.getFloat32(20, true);
      const overtone = view.getFloat32(24, true);
      const noise = view.getFloat32(28, true);
      const noiseBand = view.getFloat32(32, true);
      const timeStretch = view.getFloat32(36, true);
      const arpDirection = view.getInt32(40, true);
      const arpRange = view.getInt32(44, true);
      const arpChord = view.getInt32(48, true);
      const arpTime = view.getInt32(52, true);
      const arpGate = view.getInt32(56, true);
      const arpSlide = view.getUint8(60);
      const u2 = view.getUint8(61);
      const fullPorta = view.getUint8(62);
      const addRoot = view.getUint8(63);
      const timeGate = view.getInt16(64, true);
      const u3 = view.getInt16(66, true);
      const keyRegionMin = view.getInt32(68, true);
      const keyRegionMax = view.getInt32(72, true);
      const layerCrossfade = view.getInt32(76, true);
      const normalize = view.getUint8(80);
      const inverted = view.getUint8(81);
      const u4 = view.getUint8(82);
      const declickMode = view.getUint8(83);
      const crossfade = view.getInt32(84, true);
      const trim = view.getInt32(88, true);
      const arpRepeat = view.getInt32(92, true);
      const stretchTime = view.getInt32(96, true);
      const stretchPitch = view.getInt32(100, true);
      const stretchMultiplier = view.getInt32(104, true);
      const stretchMode = view.getInt32(108, true);
      const u5: number[] = [];
      for (let i = 0; i < 4; i++) {
        u5.push(view.getInt32(112 + i * 4, true));
      }
      const fxStart = view.getFloat64(128, true);
      const fxEnd = view.getFloat64(136, true);
      const u6 = view.getInt32(144, true);
      const playbackStart = view.getFloat32(148, true);
      const u7 = view.getInt32(152, true);
      const reverseRegions = view.getUint8(156);
      const fixTrim = view.getUint8(157);
      const u8 = view.getInt16(158, true);
      const formantShift = view.getFloat64(160, true);
      return {
        simSynthTempo, spectrumView, multiChannelWaveformView, u1, useRiff, removeDc, delayFlags, keyboardPitch,
        simSynthKeyboardPitch, drumSynthKeyboardPitch, tone, overtone, noise, noiseBand, timeStretch,
        arpDirection, arpRange, arpChord, arpTime, arpGate, arpSlide, u2, fullPorta, addRoot, timeGate, u3,
        keyRegionMin, keyRegionMax, layerCrossfade, normalize, inverted, u4, declickMode, crossfade, trim,
        arpRepeat, stretchTime, stretchPitch, stretchMultiplier, stretchMode, u5, fxStart, fxEnd, u6,
        playbackStart, u7, reverseRegions, fixTrim, u8, formantShift
      } as ChannelParameters;
    }
    case 218: { // Channel Envelope LFO
      if (payload.length < 68) return payload;
      const flags = view.getInt32(0, true);
      const envelopeEnabled = view.getInt32(4, true);
      const envelopePredelay = view.getInt32(8, true);
      const envelopeAttack = view.getInt32(12, true);
      const envelopeHold = view.getInt32(16, true);
      const envelopeDecay = view.getInt32(20, true);
      const envelopeSustain = view.getInt32(24, true);
      const envelopeRelease = view.getInt32(28, true);
      const envelopeAmount = view.getInt32(32, true);
      const lfoPredelay = view.getInt32(36, true);
      const lfoAttack = view.getInt32(40, true);
      const lfoAmount = view.getInt32(44, true);
      const lfoSpeed = view.getInt32(48, true);
      const lfoShape = view.getInt32(52, true);
      const envelopeAttackTension = view.getInt32(56, true);
      const envelopeDecayTension = view.getInt32(60, true);
      const envelopeReleaseTension = view.getInt32(64, true);
      return {
        flags, envelopeEnabled, envelopePredelay, envelopeAttack, envelopeHold, envelopeDecay,
        envelopeSustain, envelopeRelease, envelopeAmount, lfoPredelay, lfoAttack, lfoAmount,
        lfoSpeed, lfoShape, envelopeAttackTension, envelopeDecayTension, envelopeReleaseTension
      } as ChannelEnvelopeLFO;
    }
    case 219: { // Channel Levels
      if (payload.length < 24) return payload;
      const pan = view.getInt32(0, true);
      const volume = view.getInt32(4, true);
      const pitch = view.getInt32(8, true);
      const modX = view.getInt32(12, true);
      const modY = view.getInt32(16, true);
      const filterType = view.getInt32(20, true);
      return { pan, volume, pitch, modX, modY, filterType } as ChannelLevels;
    }
    case 221: { // Channel Polyphony
      if (payload.length < 9) return payload;
      const max = view.getInt32(0, true);
      const slide = view.getInt32(4, true);
      const type = view.getUint8(8) as 0 | 1 | 2;
      return { max, slide, type } as ChannelPolyphony;
    }
    case 224: { // Pattern Notes
      const notes: Note[] = [];
      const noteCount = Math.floor(payload.length / 24);
      for (let i = 0; i < noteCount; i++) {
        const noteOffset = i * 24;
        notes.push({
          position: view.getUint32(noteOffset, true),
          flags: view.getUint16(noteOffset + 4, true),
          rack: view.getUint16(noteOffset + 6, true),
          duration: view.getUint32(noteOffset + 8, true),
          key: view.getUint16(noteOffset + 12, true),
          group: view.getInt16(noteOffset + 14, true),
          pitch: view.getInt16(noteOffset + 16, true),
          release: view.getUint8(noteOffset + 18),
          midiChannel: view.getUint8(noteOffset + 19),
          pan: view.getUint8(noteOffset + 20),
          velocity: view.getUint8(noteOffset + 21),
          modX: view.getUint8(noteOffset + 22),
          modY: view.getUint8(noteOffset + 23),
        });
      }
      return notes;
    }
    case 225: { // Mixer Parameters
      const params: MixerParam[] = [];
      const paramCount = Math.floor(payload.length / 12);
      for (let i = 0; i < paramCount; i++) {
        const paramOffset = i * 12;
        const u1 = view.getInt32(paramOffset, true);
        const paramId = view.getUint8(paramOffset + 4);
        const u2 = view.getUint8(paramOffset + 5);
        const bitfield = view.getUint16(paramOffset + 6, true);
        const slot = bitfield & 0x3f;
        const insert = (bitfield >> 6) & 0x7f;
        const type = (bitfield >> 13) & 0x07;
        const data = view.getUint32(paramOffset + 8, true);
        params.push({ u1, paramId, u2, slot, insert, type, data });
      }
      return params;
    }
    case 227: { // Remote Controller
      if (payload.length < 18) return payload;
      const internalParam = view.getUint16(0, true);
      const automationChannel = view.getInt32(2, true);
      const u1 = view.getUint16(6, true);
      const targetParam = view.getUint16(8, true);
      const generatorChannel = view.getUint16(10, true);
      const params = view.getUint32(12, true);
      const smoothingFactor = view.getUint32(16, true);
      return { internalParam, automationChannel, u1, targetParam, generatorChannel, params, smoothingFactor } as RemoteController;
    }
    case 228: { // Channel Tracking
      if (payload.length < 16) return payload;
      const mid = view.getInt32(0, true);
      const pan = view.getInt32(4, true);
      const modX = view.getInt32(8, true);
      const modY = view.getInt32(12, true);
      return { mid, pan, modX, modY } as ChannelTracking;
    }
    case 229: { // Channel Level Adjusts
      if (payload.length < 20) return payload;
      const pan = view.getInt32(0, true);
      const volume = view.getInt32(4, true);
      const pitch = view.getInt32(8, true);
      const modX = view.getInt32(12, true);
      const modY = view.getInt32(16, true);
      return { pan, volume, pitch, modX, modY } as ChannelLevelAdjusts;
    }
    case 234: { // Channel Automation
      if (payload.length < 21) return payload;
      const version = view.getInt32(0, true);
      const lfoAmount = view.getInt32(4, true);
      const dontMultiplyEnvelopeLevel = view.getUint8(8);
      const u1 = view.getInt32(9, true);
      const u2 = view.getInt32(13, true);
      const numPoints = view.getInt32(17, true);

      let currentOffset = 21;
      const points: AutomationPoint[] = [];
      for (let i = 0; i < numPoints; i++) {
        if (currentOffset + 24 > payload.length) break;
        points.push({
          delta: view.getFloat64(currentOffset, true),
          value: view.getFloat64(currentOffset + 8, true),
          tension: view.getFloat32(currentOffset + 16, true),
          tensionType: view.getUint16(currentOffset + 20, true),
          isSelected: view.getUint8(currentOffset + 22),
          tensionSign: view.getInt8(currentOffset + 23),
        });
        currentOffset += 24;
      }

      if (currentOffset + 44 > payload.length) return payload;
      const unknown1 = payload.slice(currentOffset, currentOffset + 44);
      currentOffset += 44;

      if (currentOffset + 4 > payload.length) return payload;
      const numLFOPoints = view.getInt32(currentOffset, true);
      currentOffset += 4;

      const lfoPoints: AutomationPoint[] = [];
      for (let i = 0; i < numLFOPoints; i++) {
        if (currentOffset + 24 > payload.length) break;
        lfoPoints.push({
          delta: view.getFloat64(currentOffset, true),
          value: view.getFloat64(currentOffset + 8, true),
          tension: view.getFloat32(currentOffset + 16, true),
          tensionType: view.getUint16(currentOffset + 20, true),
          isSelected: view.getUint8(currentOffset + 22),
          tensionSign: view.getInt8(currentOffset + 23),
        });
        currentOffset += 24;
      }

      if (currentOffset + 20 > payload.length) return payload;
      const unknown2 = payload.slice(currentOffset, currentOffset + 20);
      currentOffset += 20;

      if (currentOffset + 20 > payload.length) return payload;
      const lfoSpeed = view.getInt32(currentOffset, true);
      const lfoTension = view.getInt32(currentOffset + 4, true);
      const lfoSkew = view.getInt32(currentOffset + 8, true);
      const lfoPulseWidth = view.getInt32(currentOffset + 12, true);
      const lfoOffset = view.getFloat32(currentOffset + 16, true);

      return {
        version, lfoAmount, dontMultiplyEnvelopeLevel, u1, u2, numPoints, points,
        unknown1, numLFOPoints, lfoPoints, unknown2, lfoSpeed, lfoTension,
        lfoSkew, lfoPulseWidth, lfoOffset
      } as ChannelAutomation;
    }
    case 238: { // Track Data
      if (payload.length < 66) return payload;
      const idx = view.getInt32(0, true);
      const color: Color = {
        red: view.getUint8(4),
        green: view.getUint8(5),
        blue: view.getUint8(6),
      };
      // byte at offset 7 is unused
      const icon = view.getInt32(8, true);
      const enabled = view.getUint8(12);
      const height = view.getFloat32(13, true);
      const lockedHeight = view.getInt32(17, true);
      const contentLocked = view.getUint8(21);
      const motion = view.getInt32(22, true);
      const press = view.getInt32(26, true);
      const triggerSync = view.getInt32(30, true);
      const queued = view.getUint32(34, true);
      const tolerant = view.getUint32(38, true);
      const positionSync = view.getInt32(42, true);
      const grouped = view.getUint8(46);
      const locked = view.getUint8(47);
      const solo = view.getUint8(48);
      const trackMode = view.getInt32(49, true);
      const targetAudioChannel = view.getInt32(53, true);
      const targetInstChannel = view.getInt32(57, true);
      const expanded = view.getUint8(61);
      const instTrackEditMode = view.getInt32(62, true);

      return {
        idx, color, icon, enabled, height, lockedHeight, contentLocked, motion, press, triggerSync,
        queued, tolerant, positionSync, grouped, locked, solo, trackMode, targetAudioChannel,
        targetInstChannel, expanded, instTrackEditMode
      } as TrackData;
    }
    default:
      return payload;
  }
}
