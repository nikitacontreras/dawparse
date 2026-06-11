import { cleanString } from './helpers.js';

export function parseChannels(events) {
  const channels = [];
  let currentChannel = null;
  let channelIdx = 0;

  for (const event of events) {
    if (event.id === 64) {
      currentChannel = {
        index: channelIdx++,
        name: `Channel ${channelIdx}`,
        enabled: true,
        volume: 78,
        panning: 0,
        samplePath: 'Generator (No Sample)',
        type: 0,
        metadata: []
      };
      channels.push(currentChannel);
    } else if (currentChannel) {
      currentChannel.metadata.push({
        id: event.id,
        name: event.name || `Event ID ${event.id}`,
        value: event.value
      });

      if (event.id === 0) {
        currentChannel.enabled = event.value === 1;
      } else if (event.id === 2) {
        currentChannel.volume = Math.round((event.value / 127) * 100);
      } else if (event.id === 72) {
        currentChannel.volume = Math.round((event.value / 12800) * 100);
      } else if (event.id === 3) {
        currentChannel.panning = event.value - 64;
      } else if (event.id === 73) {
        currentChannel.panning = Math.round((event.value - 6400) / 64);
      } else if (event.id === 192) {
        currentChannel.name = cleanString(event.value);
      } else if (event.id === 196) {
        currentChannel.samplePath = cleanString(event.value);
      } else if (event.id === 21) {
        currentChannel.type = event.value;
      } else if (event.id === 219) {
        const levels = event.value;
        if (levels && typeof levels === 'object') {
          if (levels.volume !== undefined) {
            currentChannel.volume = Math.round((levels.volume / 12800) * 100);
          }
          if (levels.pan !== undefined) {
            currentChannel.panning = Math.round((levels.pan - 6400) / 64);
          }
        }
      }
    }
  }
  return channels;
}

export function parsePatterns(events) {
  const patterns = {};
  let currentPatternIdx = 1;
  patterns[1] = {
    index: 1,
    name: 'Pattern 1',
    notes: [],
  };

  for (const event of events) {
    if (event.id === 65) {
      currentPatternIdx = event.value;
      if (!patterns[currentPatternIdx]) {
        patterns[currentPatternIdx] = {
          index: currentPatternIdx,
          name: `Pattern ${currentPatternIdx}`,
          notes: [],
        };
      }
    } else if (event.id === 193) {
      const name = cleanString(event.value);
      if (name) {
        if (currentPatternIdx !== -1) {
          if (!patterns[currentPatternIdx]) {
            patterns[currentPatternIdx] = {
              index: currentPatternIdx,
              name: name,
              notes: [],
            };
          } else {
            patterns[currentPatternIdx].name = name;
          }
        }
      }
    } else if (event.id === 224 && Array.isArray(event.value)) {
      if (currentPatternIdx !== -1) {
        if (!patterns[currentPatternIdx]) {
          patterns[currentPatternIdx] = {
            index: currentPatternIdx,
            name: `Pattern ${currentPatternIdx}`,
            notes: [],
          };
        }
        patterns[currentPatternIdx].notes = patterns[currentPatternIdx].notes.concat(event.value);
      }
    }
  }

  return Object.values(patterns).filter((p) => p.notes.length > 0);
}
