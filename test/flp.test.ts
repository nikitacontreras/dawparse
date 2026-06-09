import { describe, it, expect } from 'vitest';
import { parseFLP, serializeFLP, FLPProject, Note, AutomationPoint, TrackData, FLP } from '../src/index.js';

describe('FLP Parser & Serializer Roundtrip', () => {
  it('should parse and serialize a simple project with text, byte, and word events', () => {
    const project: FLPProject = {
      header: {
        magic: 'FLhd',
        headerSize: 6,
        fmt: 0,
        channelCount: 1,
        ppq: 96,
        dataMagic: 'FLdt',
        eventSize: 0 // Will be set by serializer
      },
      events: [
        {
          id: 194, // Project Title
          name: 'Project Title',
          type: 'data',
          value: 'My Beautiful Song'
        },
        {
          id: 2, // Channel Volume (Byte)
          name: 'Channel Volume (Byte)',
          type: 'byte',
          value: 100
        },
        {
          id: 72, // Channel Volume (Word)
          name: 'Channel Volume (Word)',
          type: 'word',
          value: 12500
        },
        {
          id: 132, // Channel Cut Group
          name: 'Channel Cut Group',
          type: 'cutGroup',
          value: { cutGroup: 1, cutBy: 2 }
        }
      ]
    };

    const buffer = serializeFLP(project);
    const parsed = parseFLP(buffer);

    expect(parsed.header.magic).toBe('FLhd');
    expect(parsed.header.fmt).toBe(0);
    expect(parsed.header.channelCount).toBe(1);
    expect(parsed.header.ppq).toBe(96);
    expect(parsed.header.dataMagic).toBe('FLdt');

    expect(parsed.events).toHaveLength(4);

    // Event 0: Project Title
    expect(parsed.events[0].id).toBe(194);
    expect(parsed.events[0].value).toBe('My Beautiful Song');

    // Event 1: Channel Volume (Byte)
    expect(parsed.events[1].id).toBe(2);
    expect(parsed.events[1].value).toBe(100);

    // Event 2: Channel Volume (Word)
    expect(parsed.events[2].id).toBe(72);
    expect(parsed.events[2].value).toBe(12500);

    // Event 3: Cut Group
    expect(parsed.events[3].id).toBe(132);
    expect(parsed.events[3].value).toEqual({ cutGroup: 1, cutBy: 2 });
  });

  it('should handle complex structured data events (Notes, Automation, TrackData)', () => {
    const note1: Note = {
      position: 192,
      flags: 0,
      rack: 1,
      duration: 96,
      key: 60,
      group: -1,
      pitch: 0,
      release: 64,
      midiChannel: 0,
      pan: 64,
      velocity: 100,
      modX: 64,
      modY: 64
    };

    const automationPoint: AutomationPoint = {
      delta: 0,
      value: 0.8,
      tension: 0.5,
      tensionType: 0,
      isSelected: 0,
      tensionSign: 1
    };

    const track: TrackData = {
      idx: 0,
      color: { red: 255, green: 128, blue: 0 },
      icon: 4,
      enabled: 1,
      height: 1.0,
      lockedHeight: 0,
      contentLocked: 0,
      motion: 0,
      press: 0,
      triggerSync: 0,
      queued: 0,
      tolerant: 0,
      positionSync: 0,
      grouped: 0,
      locked: 0,
      solo: 0,
      trackMode: 0,
      targetAudioChannel: -1,
      targetInstChannel: -1,
      expanded: 1,
      instTrackEditMode: 0
    };

    const project: FLPProject = {
      header: {
        magic: 'FLhd',
        headerSize: 6,
        fmt: 0,
        channelCount: 8,
        ppq: 192,
        dataMagic: 'FLdt',
        eventSize: 0
      },
      events: [
        {
          id: 224, // Pattern Notes
          name: 'Pattern Notes',
          type: 'data',
          value: [note1]
        },
        {
          id: 238, // Track Data
          name: 'Track Data',
          type: 'data',
          value: track
        },
        {
          id: 234, // Channel Automation
          name: 'Channel Automation',
          type: 'data',
          value: {
            version: 1,
            lfoAmount: 0,
            dontMultiplyEnvelopeLevel: 0,
            u1: 0,
            u2: 0,
            numPoints: 1,
            points: [automationPoint],
            unknown1: new Uint8Array(44),
            numLFOPoints: 0,
            lfoPoints: [],
            unknown2: new Uint8Array(20),
            lfoSpeed: 100,
            lfoTension: 0,
            lfoSkew: 0,
            lfoPulseWidth: 0,
            lfoOffset: 0
          }
        }
      ]
    };

    const buffer = serializeFLP(project);
    const parsed = parseFLP(buffer);

    expect(parsed.events).toHaveLength(3);

    // Event 0: Notes
    expect(parsed.events[0].id).toBe(224);
    const parsedNotes = parsed.events[0].value as Note[];
    expect(parsedNotes).toHaveLength(1);
    expect(parsedNotes[0]).toEqual(note1);

    // Event 1: Track Data
    expect(parsed.events[1].id).toBe(238);
    const parsedTrack = parsed.events[1].value as TrackData;
    expect(parsedTrack.color.red).toBe(255);
    expect(parsedTrack.color.green).toBe(128);
    expect(parsedTrack.color.blue).toBe(0);
    expect(parsedTrack.idx).toBe(0);
    expect(parsedTrack.enabled).toBe(1);

    // Event 2: Automation
    expect(parsed.events[2].id).toBe(234);
    const parsedAutomation = parsed.events[2].value as any;
    expect(parsedAutomation.points).toHaveLength(1);
    expect(parsedAutomation.points[0].value).toBeCloseTo(0.8);
    expect(parsedAutomation.points[0].tensionSign).toBe(1);
    expect(parsedAutomation.lfoSpeed).toBe(100);
  });

  it('should parse and serialize using the FLP class wrapper', () => {
    const project: FLPProject = {
      header: {
        magic: 'FLhd',
        headerSize: 6,
        fmt: 0,
        channelCount: 1,
        ppq: 96,
        dataMagic: 'FLdt',
        eventSize: 0
      },
      events: [
        {
          id: 194,
          name: 'Project Title',
          type: 'data',
          value: 'Class Wrapper Test'
        }
      ]
    };

    const buffer = serializeFLP(project);

    // Initialize with buffer
    const flp = new FLP({ file: buffer });
    expect(flp.project.header.magic).toBe('FLhd');
    expect(flp.project.events[0].value).toBe('Class Wrapper Test');

    // Test serialization
    const serialized = flp.serialize();
    expect(serialized.length).toBe(buffer.length);
  });
});
