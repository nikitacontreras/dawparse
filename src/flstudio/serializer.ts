import { BufferWriter } from '../shared/writer.js';
import { getEventType, isStringEvent } from './events.js';
import {
  FLPProject,
  FLPEvent,
  Note,
  MixerParam,
  TrackData,
  ChannelParameters,
  ChannelAutomation,
  PluginState,
  CutGroupEvent,
} from './types.js';
import {
  writeStruct,
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

export function serializeFLP(project: FLPProject): Uint8Array {
  // First, serialize the events stream to get the size
  const eventsWriter = new BufferWriter();

  for (const event of project.events) {
    eventsWriter.writeUint8(event.id);
    const type = getEventType(event.id);

    switch (type) {
      case 'byte': {
        eventsWriter.writeInt8(event.value as number);
        break;
      }
      case 'word': {
        eventsWriter.writeInt16(event.value as number);
        break;
      }
      case 'cutGroup': {
        const cut = event.value as CutGroupEvent;
        eventsWriter.writeInt16(cut.cutGroup);
        eventsWriter.writeInt16(cut.cutBy);
        break;
      }
      case 'dword': {
        eventsWriter.writeInt32(event.value as number);
        break;
      }
      case 'data': {
        const payload = serializeStructuredData(event.id, event.value);
        eventsWriter.writeVarInt(payload.length);
        eventsWriter.writeBytes(payload);
        break;
      }
      default:
        throw new Error(`Unknown event type for ID ${event.id}`);
    }
  }

  const eventsBuffer = eventsWriter.getBuffer();

  // Now write the FLhd header
  const headerWriter = new BufferWriter(22);
  headerWriter.writeString('FLhd');
  headerWriter.writeInt32(project.header.headerSize || 6);
  headerWriter.writeInt16(project.header.fmt);
  headerWriter.writeInt16(project.header.channelCount);
  headerWriter.writeInt16(project.header.ppq);
  headerWriter.writeString('FLdt');
  headerWriter.writeInt32(eventsBuffer.length);

  const headerBuffer = headerWriter.getBuffer();

  // Combine header and events
  const finalBuffer = new Uint8Array(headerBuffer.length + eventsBuffer.length);
  finalBuffer.set(headerBuffer, 0);
  finalBuffer.set(eventsBuffer, headerBuffer.length);

  return finalBuffer;
}

function serializeStructuredData(id: number, value: FLPEvent['value']): Uint8Array {
  if (isStringEvent(id)) {
    const encoder = new TextEncoder();
    const strBytes = encoder.encode(value as string);
    const payload = new Uint8Array(strBytes.length + 1);
    payload.set(strBytes);
    payload[strBytes.length] = 0; // null terminator
    return payload;
  }

  if (value instanceof Uint8Array) {
    return value;
  }

  // PluginState: roundtrip via rawPayload
  if (id === 213) {
    const ps = value as PluginState;
    if (ps.rawPayload && ps.rawPayload instanceof Uint8Array) {
      return ps.rawPayload;
    }
  }

  const writer = new BufferWriter();

  switch (id) {
    case 209: {
      // Channel Delay
      writeStruct(writer, ChannelDelayFields, value);
      break;
    }
    case 212: {
      // Plugin Wrapper
      writeStruct(writer, PluginWrapperFields, value);
      break;
    }
    case 215: {
      // Channel Parameters
      const val = value as ChannelParameters;
      writer.writeInt32(val.simSynthTempo);
      writer.writeUint8(val.spectrumView);
      writer.writeUint8(val.multiChannelWaveformView);
      writer.writeInt16(val.u1);
      writer.writeUint8(val.useRiff);
      writer.writeUint8(val.removeDc);
      writer.writeUint8(val.delayFlags);
      writer.writeUint8(val.keyboardPitch);
      writer.writeInt32(val.simSynthKeyboardPitch);
      writer.writeInt32(val.drumSynthKeyboardPitch);
      writer.writeFloat32(val.tone);
      writer.writeFloat32(val.overtone);
      writer.writeFloat32(val.noise);
      writer.writeFloat32(val.noiseBand);
      writer.writeFloat32(val.timeStretch);
      writer.writeInt32(val.arpDirection);
      writer.writeInt32(val.arpRange);
      writer.writeInt32(val.arpChord);
      writer.writeInt32(val.arpTime);
      writer.writeInt32(val.arpGate);
      writer.writeUint8(val.arpSlide);
      writer.writeUint8(val.u2);
      writer.writeUint8(val.fullPorta);
      writer.writeUint8(val.addRoot);
      writer.writeInt16(val.timeGate);
      writer.writeInt16(val.u3);
      writer.writeInt32(val.keyRegionMin);
      writer.writeInt32(val.keyRegionMax);
      writer.writeInt32(val.layerCrossfade);
      writer.writeUint8(val.normalize);
      writer.writeUint8(val.inverted);
      writer.writeUint8(val.u4);
      writer.writeUint8(val.declickMode);
      writer.writeInt32(val.crossfade);
      writer.writeInt32(val.trim);
      writer.writeInt32(val.arpRepeat);
      writer.writeInt32(val.stretchTime);
      writer.writeInt32(val.stretchPitch);
      writer.writeInt32(val.stretchMultiplier);
      writer.writeInt32(val.stretchMode);
      for (let i = 0; i < 4; i++) {
        writer.writeInt32(val.u5[i] ?? 0);
      }
      writer.writeFloat64(val.fxStart);
      writer.writeFloat64(val.fxEnd);
      writer.writeInt32(val.u6);
      writer.writeFloat32(val.playbackStart);
      writer.writeInt32(val.u7);
      writer.writeUint8(val.reverseRegions);
      writer.writeUint8(val.fixTrim);
      writer.writeInt16(val.u8);
      writer.writeFloat64(val.formantShift);
      break;
    }
    case 218: {
      // Channel Envelope LFO
      writeStruct(writer, ChannelEnvelopeLFOFields, value);
      break;
    }
    case 219: {
      // Channel Levels
      writeStruct(writer, ChannelLevelsFields, value);
      break;
    }
    case 221: {
      // Channel Polyphony
      writeStruct(writer, ChannelPolyphonyFields, value);
      break;
    }
    case 224: {
      // Pattern Notes
      const notes = value as Note[];
      for (const note of notes) {
        writeStruct(writer, NoteFields, note);
      }
      break;
    }
    case 225: {
      // Mixer Parameters
      const params = value as MixerParam[];
      for (const param of params) {
        const flat = {
          u1: param.u1,
          paramId: param.paramId,
          u2: param.u2,
          bitfield:
            (param.slot & 0x3f) | ((param.insert & 0x7f) << 6) | ((param.type & 0x07) << 13),
          data: param.data,
        };
        writeStruct(writer, MixerParamFields, flat);
      }
      break;
    }
    case 227: {
      // Remote Controller
      writeStruct(writer, RemoteControllerFields, value);
      break;
    }
    case 228: {
      // Channel Tracking
      writeStruct(writer, ChannelTrackingFields, value);
      break;
    }
    case 229: {
      // Channel Level Adjusts
      writeStruct(writer, ChannelLevelAdjustsFields, value);
      break;
    }
    case 234: {
      // Channel Automation
      const val = value as ChannelAutomation;
      const header = {
        version: val.version,
        lfoAmount: val.lfoAmount,
        dontMultiplyEnvelopeLevel: val.dontMultiplyEnvelopeLevel,
        u1: val.u1,
        u2: val.u2,
        numPoints: val.points.length,
      };
      writeStruct(writer, AutomationHeaderFields, header);

      for (const pt of val.points) {
        writeStruct(writer, AutomationPointFields, pt);
      }

      writer.writeBytes(val.unknown1);
      writer.writeInt32(val.lfoPoints.length);

      for (const pt of val.lfoPoints) {
        writeStruct(writer, AutomationPointFields, pt);
      }

      writer.writeBytes(val.unknown2);

      const footer = {
        lfoSpeed: val.lfoSpeed,
        lfoTension: val.lfoTension,
        lfoSkew: val.lfoSkew,
        lfoPulseWidth: val.lfoPulseWidth,
        lfoOffset: val.lfoOffset,
      };
      writeStruct(writer, AutomationFooterFields, footer);
      break;
    }
    case 238: {
      // Track Data
      const val = value as TrackData;
      const flat = {
        idx: val.idx,
        red: val.color.red,
        green: val.color.green,
        blue: val.color.blue,
        unused: 0,
        icon: val.icon,
        enabled: val.enabled,
        height: val.height,
        lockedHeight: val.lockedHeight,
        contentLocked: val.contentLocked,
        motion: val.motion,
        press: val.press,
        triggerSync: val.triggerSync,
        queued: val.queued,
        tolerant: val.tolerant,
        positionSync: val.positionSync,
        grouped: val.grouped,
        locked: val.locked,
        solo: val.solo,
        trackMode: val.trackMode,
        targetAudioChannel: val.targetAudioChannel,
        targetInstChannel: val.targetInstChannel,
        expanded: val.expanded,
        instTrackEditMode: val.instTrackEditMode,
      };
      writeStruct(writer, TrackDataFields, flat);
      break;
    }
    default:
      throw new Error(`Unsupported structured event serialization for ID ${id}`);
  }

  return writer.getBuffer();
}
