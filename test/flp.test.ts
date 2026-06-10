import { describe, it, expect } from 'vitest';
import { FLP, FLPProject, Note, AutomationPoint, TrackData, ChannelAutomation } from '../src/index.js';

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
        eventSize: 0,
      },
      events: [
        {
          id: 194, // Project Title
          name: 'Project Title',
          type: 'data',
          value: 'My Beautiful Song',
        },
        {
          id: 2, // Channel Volume (Byte)
          name: 'Channel Volume (Byte)',
          type: 'byte',
          value: 100,
        },
        {
          id: 72, // Channel Volume (Word)
          name: 'Channel Volume (Word)',
          type: 'word',
          value: 12500,
        },
        {
          id: 132, // Channel Cut Group
          name: 'Channel Cut Group',
          type: 'cutGroup',
          value: { cutGroup: 1, cutBy: 2 },
        },
      ],
    };

    const originalFLP = new FLP({ project });
    const buffer = originalFLP.serialize();
    const flp = new FLP({ file: buffer });

    expect(flp.project.header.magic).toBe('FLhd');
    expect(flp.project.header.fmt).toBe(0);
    expect(flp.project.header.channelCount).toBe(1);
    expect(flp.project.header.ppq).toBe(96);
    expect(flp.project.header.dataMagic).toBe('FLdt');

    expect(flp.project.events).toHaveLength(4);

    // Event 0: Project Title
    expect(flp.project.events[0].id).toBe(194);
    expect(flp.project.events[0].value).toBe('My Beautiful Song');

    // Event 1: Channel Volume (Byte)
    expect(flp.project.events[1].id).toBe(2);
    expect(flp.project.events[1].value).toBe(100);

    // Event 2: Channel Volume (Word)
    expect(flp.project.events[2].id).toBe(72);
    expect(flp.project.events[2].value).toBe(12500);

    // Event 3: Cut Group
    expect(flp.project.events[3].id).toBe(132);
    expect(flp.project.events[3].value).toEqual({ cutGroup: 1, cutBy: 2 });
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
      modY: 64,
    };

    const automationPoint: AutomationPoint = {
      delta: 0,
      value: 0.8,
      tension: 0.5,
      tensionType: 0,
      isSelected: 0,
      tensionSign: 1,
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
      instTrackEditMode: 0,
    };

    const project: FLPProject = {
      header: {
        magic: 'FLhd',
        headerSize: 6,
        fmt: 0,
        channelCount: 8,
        ppq: 192,
        dataMagic: 'FLdt',
        eventSize: 0,
      },
      events: [
        {
          id: 224, // Pattern Notes
          name: 'Pattern Notes',
          type: 'data',
          value: [note1],
        },
        {
          id: 238, // Track Data
          name: 'Track Data',
          type: 'data',
          value: track,
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
            lfoOffset: 0,
          },
        },
      ],
    };

    const originalFLP = new FLP({ project });
    const buffer = originalFLP.serialize();
    const flp = new FLP({ file: buffer });

    expect(flp.project.events).toHaveLength(3);

    // Event 0: Notes
    expect(flp.project.events[0].id).toBe(224);
    const parsedNotes = flp.project.events[0].value as Note[];
    expect(parsedNotes).toHaveLength(1);
    expect(parsedNotes[0]).toEqual(note1);

    // Event 1: Track Data
    expect(flp.project.events[1].id).toBe(238);
    const parsedTrack = flp.project.events[1].value as TrackData;
    expect(parsedTrack.color.red).toBe(255);
    expect(parsedTrack.color.green).toBe(128);
    expect(parsedTrack.color.blue).toBe(0);
    expect(parsedTrack.idx).toBe(0);
    expect(parsedTrack.enabled).toBe(1);

    // Event 2: Automation
    expect(flp.project.events[2].id).toBe(234);
    const parsedAutomation = flp.project.events[2].value as ChannelAutomation;
    expect(parsedAutomation.points).toHaveLength(1);
    expect(parsedAutomation.points[0].value).toBeCloseTo(0.8);
    expect(parsedAutomation.points[0].tensionSign).toBe(1);
    expect(parsedAutomation.lfoSpeed).toBe(100);
  });

  it('should get and set project BPM cleanly using class properties', () => {
    const project: FLPProject = {
      header: {
        magic: 'FLhd',
        headerSize: 6,
        fmt: 0,
        channelCount: 1,
        ppq: 96,
        dataMagic: 'FLdt',
        eventSize: 0,
      },
      events: [
        {
          id: 156, // Project Tempo
          name: 'Project Tempo',
          type: 'dword',
          value: 120000, // 120 BPM
        },
      ],
    };

    const flp = new FLP({ project });
    expect(flp.bpm).toBe(120);

    flp.bpm = 92.5;
    expect(flp.bpm).toBe(92.5);

    const tempoEvent = flp.project.events.find(e => e.id === 156);
    expect(tempoEvent?.value).toBe(92500);

    // Test default fallback push
    const projectEmpty: FLPProject = {
      header: {
        magic: 'FLhd',
        headerSize: 6,
        fmt: 0,
        channelCount: 1,
        ppq: 96,
        dataMagic: 'FLdt',
        eventSize: 0,
      },
      events: [],
    };
    const flpEmpty = new FLP({ project: projectEmpty });
    expect(flpEmpty.bpm).toBe(130); // Default fallback

    flpEmpty.bpm = 142;
    expect(flpEmpty.bpm).toBe(142);
    expect(flpEmpty.project.events[0].id).toBe(156);
    expect(flpEmpty.project.events[0].value).toBe(142000);
  });
});
