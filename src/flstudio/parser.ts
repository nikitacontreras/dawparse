import { BufferReader } from '../shared/reader.js';
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

export function parseFLP(data: Uint8Array): FLPProject {
  const reader = new BufferReader(data);

  if (reader.length < 22) {
    throw new Error('File is too small to contain a valid FLP header');
  }

  const magic = reader.readString(4);
  if (magic !== 'FLhd') {
    throw new Error(`Invalid FLP magic header: expected "FLhd", got "${magic}"`);
  }

  const headerSize = reader.readInt32();
  const fmt = reader.readInt16();
  const channelCount = reader.readInt16();
  const ppq = reader.readInt16();

  const dataMagic = reader.readString(4);
  if (dataMagic !== 'FLdt') {
    throw new Error(`Invalid FLP data magic: expected "FLdt", got "${dataMagic}"`);
  }

  const eventSize = reader.readInt32();

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
  const endOffset = Math.min(reader.length, reader.offset + eventSize);

  while (reader.offset < endOffset) {
    const id = reader.readUint8();
    const name = getEventName(id);
    const type = getEventType(id);

    let value: FLPEvent['value'];

    switch (type) {
      case 'byte': {
        value = reader.readInt8();
        break;
      }
      case 'word': {
        value = reader.readInt16();
        break;
      }
      case 'cutGroup': {
        const cutGroup = reader.readInt16();
        const cutBy = reader.readInt16();
        value = { cutGroup, cutBy } as CutGroupEvent;
        break;
      }
      case 'dword': {
        value = reader.readInt32();
        break;
      }
      case 'data': {
        const length = reader.readVarInt();
        const payload = reader.readBytes(length);
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
    if (str.endsWith('\0')) {
      str = str.slice(0, -1);
    }
    return str;
  }

  const reader = new BufferReader(payload);

  switch (id) {
    case 209: { // Channel Delay
      if (payload.length < 20) return payload;
      const feedback = reader.readInt32();
      const pan = reader.readInt32();
      const pitchShift = reader.readInt32();
      const echoes = reader.readInt32();
      const time = reader.readInt32();
      return { feedback, pan, pitchShift, echoes, time } as ChannelDelay;
    }
    case 212: { // Plugin Wrapper
      if (payload.length < 52) return payload;
      const mixerInsert = reader.readInt32();
      const mixerSlot = reader.readInt32();
      const u1 = reader.readInt32();
      const u2 = reader.readInt32();
      const flags = reader.readUint32();
      const page = reader.readUint32();
      const u3 = reader.readInt32();
      const u4 = reader.readInt32();
      const u5 = reader.readInt32();
      const x = reader.readInt32();
      const y = reader.readInt32();
      const width = reader.readUint32();
      const height = reader.readUint32();
      return { mixerInsert, mixerSlot, u1, u2, flags, page, u3, u4, u5, x, y, width, height } as PluginWrapper;
    }
    case 215: { // Channel Parameters
      if (payload.length < 168) return payload;
      const simSynthTempo = reader.readInt32();
      const spectrumView = reader.readUint8();
      const multiChannelWaveformView = reader.readUint8();
      const u1 = reader.readInt16();
      const useRiff = reader.readUint8();
      const removeDc = reader.readUint8();
      const delayFlags = reader.readUint8();
      const keyboardPitch = reader.readUint8();
      const simSynthKeyboardPitch = reader.readInt32();
      const drumSynthKeyboardPitch = reader.readInt32();
      const tone = reader.readFloat32();
      const overtone = reader.readFloat32();
      const noise = reader.readFloat32();
      const noiseBand = reader.readFloat32();
      const timeStretch = reader.readFloat32();
      const arpDirection = reader.readInt32();
      const arpRange = reader.readInt32();
      const arpChord = reader.readInt32();
      const arpTime = reader.readInt32();
      const arpGate = reader.readInt32();
      const arpSlide = reader.readUint8();
      const u2 = reader.readUint8();
      const fullPorta = reader.readUint8();
      const addRoot = reader.readUint8();
      const timeGate = reader.readInt16();
      const u3 = reader.readInt16();
      const keyRegionMin = reader.readInt32();
      const keyRegionMax = reader.readInt32();
      const layerCrossfade = reader.readInt32();
      const normalize = reader.readUint8();
      const inverted = reader.readUint8();
      const u4 = reader.readUint8();
      const declickMode = reader.readUint8();
      const crossfade = reader.readInt32();
      const trim = reader.readInt32();
      const arpRepeat = reader.readInt32();
      const stretchTime = reader.readInt32();
      const stretchPitch = reader.readInt32();
      const stretchMultiplier = reader.readInt32();
      const stretchMode = reader.readInt32();
      const u5: number[] = [];
      for (let i = 0; i < 4; i++) {
        u5.push(reader.readInt32());
      }
      const fxStart = reader.readFloat64();
      const fxEnd = reader.readFloat64();
      const u6 = reader.readInt32();
      const playbackStart = reader.readFloat32();
      const u7 = reader.readInt32();
      const reverseRegions = reader.readUint8();
      const fixTrim = reader.readUint8();
      const u8 = reader.readInt16();
      const formantShift = reader.readFloat64();
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
      const flags = reader.readInt32();
      const envelopeEnabled = reader.readInt32();
      const envelopePredelay = reader.readInt32();
      const envelopeAttack = reader.readInt32();
      const envelopeHold = reader.readInt32();
      const envelopeDecay = reader.readInt32();
      const envelopeSustain = reader.readInt32();
      const envelopeRelease = reader.readInt32();
      const envelopeAmount = reader.readInt32();
      const lfoPredelay = reader.readInt32();
      const lfoAttack = reader.readInt32();
      const lfoAmount = reader.readInt32();
      const lfoSpeed = reader.readInt32();
      const lfoShape = reader.readInt32();
      const envelopeAttackTension = reader.readInt32();
      const envelopeDecayTension = reader.readInt32();
      const envelopeReleaseTension = reader.readInt32();
      return {
        flags, envelopeEnabled, envelopePredelay, envelopeAttack, envelopeHold, envelopeDecay,
        envelopeSustain, envelopeRelease, envelopeAmount, lfoPredelay, lfoAttack, lfoAmount,
        lfoSpeed, lfoShape, envelopeAttackTension, envelopeDecayTension, envelopeReleaseTension
      } as ChannelEnvelopeLFO;
    }
    case 219: { // Channel Levels
      if (payload.length < 24) return payload;
      const pan = reader.readInt32();
      const volume = reader.readInt32();
      const pitch = reader.readInt32();
      const modX = reader.readInt32();
      const modY = reader.readInt32();
      const filterType = reader.readInt32();
      return { pan, volume, pitch, modX, modY, filterType } as ChannelLevels;
    }
    case 221: { // Channel Polyphony
      if (payload.length < 9) return payload;
      const max = reader.readInt32();
      const slide = reader.readInt32();
      const type = reader.readUint8() as 0 | 1 | 2;
      return { max, slide, type } as ChannelPolyphony;
    }
    case 224: { // Pattern Notes
      const notes: Note[] = [];
      const noteCount = Math.floor(payload.length / 24);
      for (let i = 0; i < noteCount; i++) {
        notes.push({
          position: reader.readUint32(),
          flags: reader.readUint16(),
          rack: reader.readUint16(),
          duration: reader.readUint32(),
          key: reader.readUint16(),
          group: reader.readInt16(),
          pitch: reader.readInt16(),
          release: reader.readUint8(),
          midiChannel: reader.readUint8(),
          pan: reader.readUint8(),
          velocity: reader.readUint8(),
          modX: reader.readUint8(),
          modY: reader.readUint8(),
        });
      }
      return notes;
    }
    case 225: { // Mixer Parameters
      const params: MixerParam[] = [];
      const paramCount = Math.floor(payload.length / 12);
      for (let i = 0; i < paramCount; i++) {
        const u1 = reader.readInt32();
        const paramId = reader.readUint8();
        const u2 = reader.readUint8();
        const bitfield = reader.readUint16();
        const slot = bitfield & 0x3f;
        const insert = (bitfield >> 6) & 0x7f;
        const type = (bitfield >> 13) & 0x07;
        const data = reader.readUint32();
        params.push({ u1, paramId, u2, slot, insert, type, data });
      }
      return params;
    }
    case 227: { // Remote Controller
      if (payload.length < 18) return payload;
      const internalParam = reader.readUint16();
      const automationChannel = reader.readInt32();
      const u1 = reader.readUint16();
      const targetParam = reader.readUint16();
      const generatorChannel = reader.readUint16();
      const params = reader.readUint32();
      const smoothingFactor = reader.readUint32();
      return { internalParam, automationChannel, u1, targetParam, generatorChannel, params, smoothingFactor } as RemoteController;
    }
    case 228: { // Channel Tracking
      if (payload.length < 16) return payload;
      const mid = reader.readInt32();
      const pan = reader.readInt32();
      const modX = reader.readInt32();
      const modY = reader.readInt32();
      return { mid, pan, modX, modY } as ChannelTracking;
    }
    case 229: { // Channel Level Adjusts
      if (payload.length < 20) return payload;
      const pan = reader.readInt32();
      const volume = reader.readInt32();
      const pitch = reader.readInt32();
      const modX = reader.readInt32();
      const modY = reader.readInt32();
      return { pan, volume, pitch, modX, modY } as ChannelLevelAdjusts;
    }
    case 234: { // Channel Automation
      if (payload.length < 21) return payload;
      const version = reader.readInt32();
      const lfoAmount = reader.readInt32();
      const dontMultiplyEnvelopeLevel = reader.readUint8();
      const u1 = reader.readInt32();
      const u2 = reader.readInt32();
      const numPoints = reader.readInt32();

      const points: AutomationPoint[] = [];
      for (let i = 0; i < numPoints; i++) {
        if (reader.remaining < 24) break;
        points.push({
          delta: reader.readFloat64(),
          value: reader.readFloat64(),
          tension: reader.readFloat32(),
          tensionType: reader.readUint16(),
          isSelected: reader.readUint8(),
          tensionSign: reader.readInt8(),
        });
      }

      if (reader.remaining < 44) return payload;
      const unknown1 = reader.readBytes(44);

      if (reader.remaining < 4) return payload;
      const numLFOPoints = reader.readInt32();

      const lfoPoints: AutomationPoint[] = [];
      for (let i = 0; i < numLFOPoints; i++) {
        if (reader.remaining < 24) break;
        lfoPoints.push({
          delta: reader.readFloat64(),
          value: reader.readFloat64(),
          tension: reader.readFloat32(),
          tensionType: reader.readUint16(),
          isSelected: reader.readUint8(),
          tensionSign: reader.readInt8(),
        });
      }

      if (reader.remaining < 20) return payload;
      const unknown2 = reader.readBytes(20);

      if (reader.remaining < 20) return payload;
      const lfoSpeed = reader.readInt32();
      const lfoTension = reader.readInt32();
      const lfoSkew = reader.readInt32();
      const lfoPulseWidth = reader.readInt32();
      const lfoOffset = reader.readFloat32();

      return {
        version, lfoAmount, dontMultiplyEnvelopeLevel, u1, u2, numPoints, points,
        unknown1, numLFOPoints, lfoPoints, unknown2, lfoSpeed, lfoTension,
        lfoSkew, lfoPulseWidth, lfoOffset
      } as ChannelAutomation;
    }
    case 238: { // Track Data
      if (payload.length < 66) return payload;
      const idx = reader.readInt32();
      const color: Color = {
        red: reader.readUint8(),
        green: reader.readUint8(),
        blue: reader.readUint8(),
      };
      reader.readUint8(); // read unused byte at offset 7
      const icon = reader.readInt32();
      const enabled = reader.readUint8();
      const height = reader.readFloat32();
      const lockedHeight = reader.readInt32();
      const contentLocked = reader.readUint8();
      const motion = reader.readInt32();
      const press = reader.readInt32();
      const triggerSync = reader.readInt32();
      const queued = reader.readUint32();
      const tolerant = reader.readUint32();
      const positionSync = reader.readInt32();
      const grouped = reader.readUint8();
      const locked = reader.readUint8();
      const solo = reader.readUint8();
      const trackMode = reader.readInt32();
      const targetAudioChannel = reader.readInt32();
      const targetInstChannel = reader.readInt32();
      const expanded = reader.readUint8();
      const instTrackEditMode = reader.readInt32();

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
