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
  PluginState,
  PluginStateString,
  PluginStateVstChunk,
  PluginStateSection,
  CutGroupEvent,
} from './types.js';
import {
  KNOWN_SIZES,
  readStruct,
  ChannelDelayFields,
  PluginWrapperFields,
  ChannelParametersCoreFields,
  ChannelParametersTailFields,
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
    if (payload.length === 0) return '';

    // Check if the payload is UTF-16 LE
    let isUtf16 = false;
    if (payload.length >= 2) {
      let zeroCountOdd = 0;
      let totalOdd = 0;
      for (let i = 1; i < payload.length; i += 2) {
        totalOdd++;
        if (payload[i] === 0) zeroCountOdd++;
      }
      if (zeroCountOdd / totalOdd > 0.8) {
        isUtf16 = true;
      }
    }

    const decoder = new TextDecoder(isUtf16 ? 'utf-16le' : 'utf-8');
    let str = decoder.decode(payload);
    if (str.endsWith('\0')) {
      str = str.slice(0, -1);
    }
    return str;
  }

  // Validate payload size against known sizes; unknown sizes or mismatches get a warning
  const known = KNOWN_SIZES[id];
  if (known && !known.includes(payload.length)) {
    console.warn(
      `FLP event ID ${id} (${getEventName(id)}): unexpected payload size ${payload.length}B (expected ${known.join(' or ')}B) — attempting partial parse`,
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
      const core = readStruct<Record<string, unknown>>(reader, ChannelParametersCoreFields);
      const u5: number[] = [];
      for (let i = 0; i < 4; i++) {
        u5.push(reader.readInt32());
      }
      const tail = readStruct<Record<string, unknown>>(reader, ChannelParametersTailFields);
      return { ...core, u5, ...tail } as unknown as ChannelParameters;
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
    case 213: {
      return parsePluginState(payload);
    }
    default:
      return payload;
  }
}

function readInt32LE(data: Uint8Array, offset: number): number {
  return (data[offset] | (data[offset + 1] << 8) | (data[offset + 2] << 16) | (data[offset + 3] << 24)) >> 0;
}

function extractNullTerminatedStrings(data: Uint8Array, maxOffset: number): PluginStateString[] {
  const result: PluginStateString[] = [];
  let i = 0;
  while (i < Math.min(maxOffset, data.length)) {
    if (data[i] >= 32 && data[i] <= 126) {
      const start = i;
      while (i < data.length && data[i] >= 32 && data[i] <= 126) {
        i++;
      }
      const len = i - start;
      if (len >= 4) {
        const str = new TextDecoder().decode(data.slice(start, i));
        result.push({ offset: start, value: str });
      }
    } else {
      i++;
    }
  }
  return result;
}

function findVstMarkers(data: Uint8Array): { name: string; offset: number }[] {
  const markers: { name: string; offset: number }[] = [];
  for (const name of ['VstW', 'CcnK', 'FBCh', 'Smpl']) {
    const encoded = new TextEncoder().encode(name);
    for (let i = 0; i <= data.length - encoded.length; i++) {
      let match = true;
      for (let j = 0; j < encoded.length; j++) {
        if (data[i + j] !== encoded[j]) { match = false; break; }
      }
      if (match) {
        markers.push({ name, offset: i });
      }
    }
  }
  return markers;
}

function extractEmbeddedJson(data: Uint8Array): { json: Record<string, unknown> | null; offset: number; size: number } {
  const pj = new TextEncoder().encode('#P');
  for (let i = 0; i <= data.length - pj.length; i++) {
    let match = true;
    for (let j = 0; j < pj.length; j++) {
      if (data[i + j] !== pj[j]) { match = false; break; }
    }
    if (!match) continue;
    const braceStart = i + 2; // skip #P
    if (braceStart >= data.length || data[braceStart] !== 0x7b) continue; // {
    
    let depth = 0;
    let inStr = false;
    let escaped = false;
    let end = -1;
    for (let k = braceStart; k < data.length; k++) {
      const b = data[k];
      if (escaped) { escaped = false; continue; }
      if (b === 0x5c) { escaped = true; continue; } // backslash
      if (b === 0x22) { inStr = !inStr; continue; } // double quote
      if (inStr) continue;
      if (b === 0x7b) depth++; // {
      if (b === 0x7d) { depth--; if (depth === 0) { end = k + 1; break; } } // }
    }
    
    if (end > 0) {
      const jsonBytes = data.slice(braceStart, end);
      const jsonStr = new TextDecoder().decode(jsonBytes);
      try {
        return { json: JSON.parse(jsonStr) as Record<string, unknown>, offset: i, size: end - i };
      } catch {
        return { json: null, offset: i, size: end - i };
      }
    }
  }
  return { json: null, offset: -1, size: 0 };
}

function parsePluginState(payload: Uint8Array): PluginState {
  const header: number[] = [];
  for (let i = 0; i < Math.min(360, payload.length); i += 4) {
    header.push(readInt32LE(payload, i));
  }

  const strEnd = payload.length;
  const allStrings = extractNullTerminatedStrings(payload, strEnd);
  const strings = allStrings.filter((s) => s.value.length >= 4);

  const vstMarkers = findVstMarkers(payload);
  const { json, offset: jsonOffset, size: jsonSize } = extractEmbeddedJson(payload);

  const vstChunk: PluginStateVstChunk = {
    markers: vstMarkers,
    embeddedJson: json,
    jsonOffset,
    jsonSize,
  };

  const sections: PluginStateSection[] = [];

  // Divide into sections based on known boundaries
  // String table starts with STSV marker
  const stsvOffset = payload.findIndex((_, i) =>
    i + 3 < payload.length &&
    payload[i] === 0x53 && payload[i + 1] === 0x54 &&
    payload[i + 2] === 0x53 && payload[i + 3] === 0x56
  );

  if (stsvOffset > 0) {
    sections.push({ label: 'FLP Header', offset: 0, size: stsvOffset, data: payload.slice(0, stsvOffset) });
  }

  // VstW marks the VST chunk
  const vstwMarker = vstMarkers.find((m) => m.name === 'VstW');
  if (vstwMarker) {
    const vstStart = vstwMarker.offset;
    if (stsvOffset > 0) {
      sections.push({ label: 'String Table', offset: stsvOffset, size: vstStart - stsvOffset, data: payload.slice(stsvOffset, vstStart) });
    } else if (stsvOffset < 0) {
      sections.push({ label: 'FLP Header', offset: 0, size: vstStart, data: payload.slice(0, vstStart) });
    }

    // JSON within VST chunk
    if (jsonOffset >= vstStart) {
      sections.push({ label: 'VST Chunk', offset: vstStart, size: jsonOffset - vstStart, data: payload.slice(vstStart, jsonOffset) });
      sections.push({ label: 'Embedded JSON (Serato Project)', offset: jsonOffset, size: jsonSize, data: payload.slice(jsonOffset, jsonOffset + jsonSize) });
      const afterJson = jsonOffset + jsonSize;
      sections.push({ label: 'VST Chunk (cont.)', offset: afterJson, size: vstStart + 9200 - afterJson, data: payload.slice(afterJson, vstStart + 9200) });
    } else {
      sections.push({ label: 'VST Chunk', offset: vstStart, size: 9200, data: payload.slice(vstStart, vstStart + 9200) });
    }
  } else {
    if (stsvOffset > 0) {
      sections.push({ label: 'String Table', offset: stsvOffset, size: payload.length - stsvOffset, data: payload.slice(stsvOffset) });
    }
  }

  // JUCE section
  const juceOffset = payload.findIndex((_, i) =>
    i + 3 < payload.length &&
    payload[i] === 0x4a && payload[i + 1] === 0x55 &&
    payload[i + 2] === 0x43 && payload[i + 3] === 0x45
  );
  if (juceOffset > 0) {
    sections.push({ label: 'JUCE Private Data', offset: juceOffset, size: payload.length - juceOffset, data: payload.slice(juceOffset) });
  }

  return {
    header,
    strings,
    vstChunk,
    sections,
    rawPayload: payload,
  };
}
