import { BufferWriter } from '../shared/writer.js';
import { getEventType, isStringEvent } from './events.js';
import {
  FLPProject,
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

  const writer = new BufferWriter();

  switch (id) {
    case 209: { // Channel Delay
      const val = value as ChannelDelay;
      writer.writeInt32(val.feedback);
      writer.writeInt32(val.pan);
      writer.writeInt32(val.pitchShift);
      writer.writeInt32(val.echoes);
      writer.writeInt32(val.time);
      break;
    }
    case 212: { // Plugin Wrapper
      const val = value as PluginWrapper;
      writer.writeInt32(val.mixerInsert);
      writer.writeInt32(val.mixerSlot);
      writer.writeInt32(val.u1);
      writer.writeInt32(val.u2);
      writer.writeUint32(val.flags);
      writer.writeUint32(val.page);
      writer.writeInt32(val.u3);
      writer.writeInt32(val.u4);
      writer.writeInt32(val.u5);
      writer.writeInt32(val.x);
      writer.writeInt32(val.y);
      writer.writeUint32(val.width);
      writer.writeUint32(val.height);
      break;
    }
    case 215: { // Channel Parameters
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
    case 218: { // Channel Envelope LFO
      const val = value as ChannelEnvelopeLFO;
      writer.writeInt32(val.flags);
      writer.writeInt32(val.envelopeEnabled);
      writer.writeInt32(val.envelopePredelay);
      writer.writeInt32(val.envelopeAttack);
      writer.writeInt32(val.envelopeHold);
      writer.writeInt32(val.envelopeDecay);
      writer.writeInt32(val.envelopeSustain);
      writer.writeInt32(val.envelopeRelease);
      writer.writeInt32(val.envelopeAmount);
      writer.writeInt32(val.lfoPredelay);
      writer.writeInt32(val.lfoAttack);
      writer.writeInt32(val.lfoAmount);
      writer.writeInt32(val.lfoSpeed);
      writer.writeInt32(val.lfoShape);
      writer.writeInt32(val.envelopeAttackTension);
      writer.writeInt32(val.envelopeDecayTension);
      writer.writeInt32(val.envelopeReleaseTension);
      break;
    }
    case 219: { // Channel Levels
      const val = value as ChannelLevels;
      writer.writeInt32(val.pan);
      writer.writeInt32(val.volume);
      writer.writeInt32(val.pitch);
      writer.writeInt32(val.modX);
      writer.writeInt32(val.modY);
      writer.writeInt32(val.filterType);
      break;
    }
    case 221: { // Channel Polyphony
      const val = value as ChannelPolyphony;
      writer.writeInt32(val.max);
      writer.writeInt32(val.slide);
      writer.writeUint8(val.type);
      break;
    }
    case 224: { // Pattern Notes
      const notes = value as Note[];
      for (const note of notes) {
        writer.writeUint32(note.position);
        writer.writeUint16(note.flags);
        writer.writeUint16(note.rack);
        writer.writeUint32(note.duration);
        writer.writeUint16(note.key);
        writer.writeInt16(note.group);
        writer.writeInt16(note.pitch);
        writer.writeUint8(note.release);
        writer.writeUint8(note.midiChannel);
        writer.writeUint8(note.pan);
        writer.writeUint8(note.velocity);
        writer.writeUint8(note.modX);
        writer.writeUint8(note.modY);
      }
      break;
    }
    case 225: { // Mixer Parameters
      const params = value as MixerParam[];
      for (const param of params) {
        writer.writeInt32(param.u1);
        writer.writeUint8(param.paramId);
        writer.writeUint8(param.u2);
        const bitfield = (param.slot & 0x3f) | ((param.insert & 0x7f) << 6) | ((param.type & 0x07) << 13);
        writer.writeUint16(bitfield);
        writer.writeUint32(param.data);
      }
      break;
    }
    case 227: { // Remote Controller
      const val = value as RemoteController;
      writer.writeUint16(val.internalParam);
      writer.writeInt32(val.automationChannel);
      writer.writeUint16(val.u1);
      writer.writeUint16(val.targetParam);
      writer.writeUint16(val.generatorChannel);
      writer.writeUint32(val.params);
      writer.writeUint32(val.smoothingFactor);
      break;
    }
    case 228: { // Channel Tracking
      const val = value as ChannelTracking;
      writer.writeInt32(val.mid);
      writer.writeInt32(val.pan);
      writer.writeInt32(val.modX);
      writer.writeInt32(val.modY);
      break;
    }
    case 229: { // Channel Level Adjusts
      const val = value as ChannelLevelAdjusts;
      writer.writeInt32(val.pan);
      writer.writeInt32(val.volume);
      writer.writeInt32(val.pitch);
      writer.writeInt32(val.modX);
      writer.writeInt32(val.modY);
      break;
    }
    case 234: { // Channel Automation
      const val = value as ChannelAutomation;
      writer.writeInt32(val.version);
      writer.writeInt32(val.lfoAmount);
      writer.writeUint8(val.dontMultiplyEnvelopeLevel);
      writer.writeInt32(val.u1);
      writer.writeInt32(val.u2);
      writer.writeInt32(val.points.length);

      for (const pt of val.points) {
        writer.writeFloat64(pt.delta);
        writer.writeFloat64(pt.value);
        writer.writeFloat32(pt.tension);
        writer.writeUint16(pt.tensionType);
        writer.writeUint8(pt.isSelected);
        writer.writeInt8(pt.tensionSign);
      }

      writer.writeBytes(val.unknown1);
      writer.writeInt32(val.lfoPoints.length);

      for (const pt of val.lfoPoints) {
        writer.writeFloat64(pt.delta);
        writer.writeFloat64(pt.value);
        writer.writeFloat32(pt.tension);
        writer.writeUint16(pt.tensionType);
        writer.writeUint8(pt.isSelected);
        writer.writeInt8(pt.tensionSign);
      }

      writer.writeBytes(val.unknown2);
      writer.writeInt32(val.lfoSpeed);
      writer.writeInt32(val.lfoTension);
      writer.writeInt32(val.lfoSkew);
      writer.writeInt32(val.lfoPulseWidth);
      writer.writeFloat32(val.lfoOffset);
      break;
    }
    case 238: { // Track Data
      const val = value as TrackData;
      writer.writeInt32(val.idx);
      writer.writeUint8(val.color.red);
      writer.writeUint8(val.color.green);
      writer.writeUint8(val.color.blue);
      writer.writeUint8(0); // unused byte
      writer.writeInt32(val.icon);
      writer.writeUint8(val.enabled);
      writer.writeFloat32(val.height);
      writer.writeInt32(val.lockedHeight);
      writer.writeUint8(val.contentLocked);
      writer.writeInt32(val.motion);
      writer.writeInt32(val.press);
      writer.writeInt32(val.triggerSync);
      writer.writeUint32(val.queued);
      writer.writeUint32(val.tolerant);
      writer.writeInt32(val.positionSync);
      writer.writeUint8(val.grouped);
      writer.writeUint8(val.locked);
      writer.writeUint8(val.solo);
      writer.writeInt32(val.trackMode);
      writer.writeInt32(val.targetAudioChannel);
      writer.writeInt32(val.targetInstChannel);
      writer.writeUint8(val.expanded);
      writer.writeInt32(val.instTrackEditMode);
      break;
    }
    default:
      throw new Error(`Unsupported structured event serialization for ID ${id}`);
  }

  return writer.getBuffer();
}
