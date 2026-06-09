# dawparse

A lightweight, high-performance, and type-safe parser and serializer for FL Studio Project (`.flp`) files and Zipped Loop Packages (`.zip`). Works seamlessly in both browser (Web) and Node.js (Backend) environments.

## Features

- **Zero Platform Dependencies**: Built using standard JavaScript `Uint8Array`, `DataView`, and `TextDecoder`. Works on any JS environment.
- **Bi-directional Parsing & Serialization**: Parse `.flp` files into clean JavaScript objects, modify them, and serialize them back into binary format with 100% data fidelity.
- **Zipped Loop Package (`.zip`) Support**: Decompress and parse zipped projects directly, extracting the main project file and all associated audio/sample assets.
- **Dual Build Formats**: Bundled in both CommonJS (`.cjs`) and ES Modules (`.js`) with complete TypeScript declarations.

## Installation

```bash
npm install dawparse
```

## Quick Start

### Parsing an FLP File (Node.js)

```typescript
import * as fs from 'fs';
import { parseFLP } from 'dawparse';

const fileBuffer = fs.readFileSync('project.flp');
const project = parseFLP(new Uint8Array(fileBuffer));

console.log('Project PPQ:', project.header.ppq);
console.log('Channels Count:', project.header.channelCount);
console.log('Events Count:', project.events.length);
```

### Parsing a Zipped Loop Package (Node.js & Web)

```typescript
import * as fs from 'fs';
import { parseFLPZip } from 'dawparse';

const zipBuffer = fs.readFileSync('project.zip');
const { project, flpName, files } = parseFLPZip(new Uint8Array(zipBuffer));

console.log('Main FLP Name:', flpName);
console.log('Project Title:', project.events.find(e => e.id === 194)?.value);

// Retrieve audio samples inside the package
const kickSampleBytes = files['Kick_Drum.wav'];
if (kickSampleBytes) {
  console.log('Kick Sample Size:', kickSampleBytes.length, 'bytes');
}
```

### Modifying and Serializing a Project

```typescript
import * as fs from 'fs';
import { serializeFLP, FLPProject } from 'dawparse';

const project: FLPProject = {
  header: {
    magic: 'FLhd',
    headerSize: 6,
    fmt: 0,
    channelCount: 1,
    ppq: 96,
    dataMagic: 'FLdt',
    eventSize: 0 // Will be calculated dynamically
  },
  events: [
    {
      id: 194, // Project Title
      name: 'Project Title',
      type: 'data',
      value: 'My New Song'
    }
  ]
};

// Serialize the object to a Uint8Array
const binaryFLP = serializeFLP(project);
fs.writeFileSync('new_project.flp', binaryFLP);
```

## Running Tests

We use [Vitest](https://vitest.dev/) for testing.

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch
```

## License

MIT
