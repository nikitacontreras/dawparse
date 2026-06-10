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
  CutGroupEvent,
} from './types.js';
import {
  EXPECTED_LENGTHS,
  readStruct,
  ChannelDelayFields,
  PluginWrapperFields,
  ChannelEnvelopeLFOFields,
  ChannelLevelsFields,
  ChannelPolyphonyFields,
  NoteFields,
  MixerParamFields,
  RemoteControllerFields,
  ChannelTrackingFields,
  ChannelLevelAdjustsFields,
  AutomationPointFields,
  AutomationHeaderFields,
  AutomationFooterFields,
  TrackDataFields,
} from './schemas.js';

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

  // Enforce validation for expected payload lengths
  const expectedLen = EXPECTED_LENGTHS[id];
  if (expectedLen !== undefined && payload.length < expectedLen) {
    throw new Error(
      `FLP structured event ID ${id} too short: expected at least ${expectedLen} bytes, got ${payload.length} bytes`,
    );
  }

  const reader = new BufferReader(payload);

  switch (id) {
    case 209: {
      // Channel Delay
      return readStruct<ChannelDelay>(reader, ChannelDelayFields);
    }
    case 212: {
      // Plugin Wrapper
      return readStruct<PluginWrapper>(reader, PluginWrapperFields);
    }
    case 215: {
      // Channel Parameters
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
        simSynthTempo,
        spectrumView,
        multiChannelWaveformView,
        u1,
        useRiff,
        removeDc,
        delayFlags,
        keyboardPitch,
        simSynthKeyboardPitch,
        drumSynthKeyboardPitch,
        tone,
        overtone,
        noise,
        noiseBand,
        timeStretch,
        arpDirection,
        arpRange,
        arpChord,
        arpTime,
        arpGate,
        arpSlide,
        u2,
        fullPorta,
        addRoot,
        timeGate,
        u3,
        keyRegionMin,
        keyRegionMax,
        layerCrossfade,
        normalize,
        inverted,
        u4,
        declickMode,
        crossfade,
        trim,
        arpRepeat,
        stretchTime,
        stretchPitch,
        stretchMultiplier,
        stretchMode,
        u5,
        fxStart,
        fxEnd,
        u6,
        playbackStart,
        u7,
        reverseRegions,
        fixTrim,
        u8,
        formantShift,
      } as ChannelParameters;
    }
    case 218: {
      // Channel Envelope LFO
      return readStruct<ChannelEnvelopeLFO>(reader, ChannelEnvelopeLFOFields);
    }
    case 219: {
      // Channel Levels
      return readStruct<ChannelLevels>(reader, ChannelLevelsFields);
    }
    case 221: {
      // Channel Polyphony
      return readStruct<ChannelPolyphony>(reader, ChannelPolyphonyFields);
    }
    case 224: {
      // Pattern Notes
      if (payload.length % 24 !== 0) {
        throw new Error(
          `FLP structured event ID 224 size mismatch: expected multiple of 24 bytes, got ${payload.length} bytes`,
        );
      }
      const notes: Note[] = [];
      const noteCount = Math.floor(payload.length / 24);
      for (let i = 0; i < noteCount; i++) {
        notes.push(readStruct<Note>(reader, NoteFields));
      }
      return notes;
    }
    case 225: {
      // Mixer Parameters
      if (payload.length % 12 !== 0) {
        throw new Error(
          `FLP structured event ID 225 size mismatch: expected multiple of 12 bytes, got ${payload.length} bytes`,
        );
      }
      const params: MixerParam[] = [];
      const paramCount = Math.floor(payload.length / 12);
      for (let i = 0; i < paramCount; i++) {
        const flat = readStruct<Record<string, number>>(reader, MixerParamFields);
        params.push({
          u1: flat.u1,
          paramId: flat.paramId,
          u2: flat.u2,
          slot: flat.bitfield & 0x3f,
          insert: (flat.bitfield >> 6) & 0x7f,
          type: (flat.bitfield >> 13) & 0x07,
          data: flat.data,
        });
      }
      return params;
    }
    case 227: {
      // Remote Controller
      return readStruct<RemoteController>(reader, RemoteControllerFields);
    }
    case 228: {
      // Channel Tracking
      return readStruct<ChannelTracking>(reader, ChannelTrackingFields);
    }
    case 229: {
      // Channel Level Adjusts
      return readStruct<ChannelLevelAdjusts>(reader, ChannelLevelAdjustsFields);
    }
    case 234: {
      // Channel Automation
      if (payload.length < 21) {
        throw new Error(
          `FLP structured event ID 234 too short: expected at least 21 bytes, got ${payload.length} bytes`,
        );
      }
      const header = readStruct<Record<string, number>>(reader, AutomationHeaderFields);

      const points: AutomationPoint[] = [];
      for (let i = 0; i < header.numPoints; i++) {
        if (reader.remaining < 24) {
          throw new Error(
            `FLP structured event ID 234 truncated: ran out of bytes parsing automation point ${i}`,
          );
        }
        points.push(readStruct<AutomationPoint>(reader, AutomationPointFields));
      }

      if (reader.remaining < 44) {
        throw new Error(
          `FLP structured event ID 234 truncated: missing unknown1 data segment (remaining: ${reader.remaining})`,
        );
      }
      const unknown1 = reader.readBytes(44);

      if (reader.remaining < 4) {
        throw new Error(
          `FLP structured event ID 234 truncated: missing numLFOPoints header (remaining: ${reader.remaining})`,
        );
      }
      const numLFOPoints = reader.readInt32();

      const lfoPoints: AutomationPoint[] = [];
      for (let i = 0; i < numLFOPoints; i++) {
        if (reader.remaining < 24) {
          throw new Error(
            `FLP structured event ID 234 truncated: ran out of bytes parsing LFO automation point ${i}`,
          );
        }
        lfoPoints.push(readStruct<AutomationPoint>(reader, AutomationPointFields));
      }

      if (reader.remaining < 20) {
        throw new Error(
          `FLP structured event ID 234 truncated: missing unknown2 data segment (remaining: ${reader.remaining})`,
        );
      }
      const unknown2 = reader.readBytes(20);

      if (reader.remaining < 20) {
        throw new Error(
          `FLP structured event ID 234 truncated: missing automation footer (remaining: ${reader.remaining})`,
        );
      }
      const footer = readStruct<Record<string, number>>(reader, AutomationFooterFields);

      return {
        version: header.version,
        lfoAmount: header.lfoAmount,
        dontMultiplyEnvelopeLevel: header.dontMultiplyEnvelopeLevel,
        u1: header.u1,
        u2: header.u2,
        numPoints: header.numPoints,
        points,
        unknown1,
        numLFOPoints,
        lfoPoints,
        unknown2,
        lfoSpeed: footer.lfoSpeed,
        lfoTension: footer.lfoTension,
        lfoSkew: footer.lfoSkew,
        lfoPulseWidth: footer.lfoPulseWidth,
        lfoOffset: footer.lfoOffset,
      } as ChannelAutomation;
    }
    case 238: {
      // Track Data
      const flat = readStruct<Record<string, number>>(reader, TrackDataFields);
      return {
        idx: flat.idx,
        color: { red: flat.red, green: flat.green, blue: flat.blue } as Color,
        icon: flat.icon,
        enabled: flat.enabled,
        height: flat.height,
        lockedHeight: flat.lockedHeight,
        contentLocked: flat.contentLocked,
        motion: flat.motion,
        press: flat.press,
        triggerSync: flat.triggerSync,
        queued: flat.queued,
        tolerant: flat.tolerant,
        positionSync: flat.positionSync,
        grouped: flat.grouped,
        locked: flat.locked,
        solo: flat.solo,
        trackMode: flat.trackMode,
        targetAudioChannel: flat.targetAudioChannel,
        targetInstChannel: flat.targetInstChannel,
        expanded: flat.expanded,
        instTrackEditMode: flat.instTrackEditMode,
      } as TrackData;
    }
    default:
      return payload;
  }
}
