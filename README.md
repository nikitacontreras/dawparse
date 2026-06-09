# dawparse

A lightweight, high-performance, and type-safe parser and serializer for DAW (Digital Audio Workstation) projects. It supports browser (Web) and Node.js (Backend) environments with zero platform dependencies.

Currently, `dawparse` supports parsing and serializing **FL Studio Project files (`.flp`)** and **Zipped Loop Packages (`.zip`)**, with a modular architecture built to scale to other DAWs (like Ableton, Reaper, etc.) in the future.

---

## Features

- **Zero Platform Dependencies**: Built using standard JavaScript `Uint8Array`, `DataView`, and `TextDecoder`. Works in any JS environment (Browsers, Node.js, Deno, Bun).
- **Scalable DAW Architecture**: A modular folder structure separating DAW-specific formats (e.g. `flstudio`) from shared binary reading/writing primitives (`BufferReader` and `BufferWriter`).
- **Object-Oriented API**: Simple, clean class wrappers for DAW project files supporting instantiation via local file paths (Node.js) or buffers (Web/Node.js).
- **Zipped Loop Package (`.zip`) Support**: Decompress zipped packages directly, retrieving the project file and associated audio assets.
- **Bi-directional Parsing & Serialization**: Read projects, modify their structures, and compile them back into binary format with 100% data fidelity.

---

## Installation

```bash
npm install dawparse
```

---

## Quick Start (Object-Oriented API)

The `FLP` class represents an FL Studio project and wraps both parsing and serialization.

### 1. Parsing a Zipped Loop Package (Node.js & Web)

You can pass either a local file path (Node.js only) or a binary array buffer (Web and Node.js).

```typescript
import { FLP } from 'dawparse';

// Instantiating via a string path (Node.js)
const zip = new FLP({
  zip: './my_project.zip'
});

console.log('Main project filename:', zip.flpName); // "untitled.flp"
console.log('Project PPQ:', zip.project.header.ppq); // 96

// Retrieve packed audio/sample files
const kickSampleBytes = zip.files?.['Basic 808 Kick.wav'];
if (kickSampleBytes) {
  console.log('Kick Sample Size:', kickSampleBytes.length, 'bytes');
}
```

### 2. Parsing a Raw `.flp` File (Web / Browser)

For browser environments, retrieve files as buffers and instantiate:

```javascript
import { FLP } from 'dawparse';

const inputElement = document.querySelector('input[type="file"]');
inputElement.addEventListener('change', async (event) => {
  const file = event.target.files[0];
  const arrayBuffer = await file.arrayBuffer();

  // Instantiate from buffer
  const flp = new FLP({
    file: new Uint8Array(arrayBuffer)
  });

  console.log('FLP Magic:', flp.project.header.magic); // "FLhd"
  console.log('Format:', flp.project.header.fmt);
});
```

### 3. Modifying and Saving a Project

```typescript
import * as fs from 'fs';
import { FLP } from 'dawparse';

const flp = new FLP({ file: './song.flp' });

// Modify project comments
const commentsEvent = flp.project.events.find(e => e.id === 195);
if (commentsEvent) {
  commentsEvent.value = 'Updated project comments!';
}

// Serialize back to binary Uint8Array
const outputBuffer = flp.serialize();
fs.writeFileSync('song_modified.flp', outputBuffer);
```

---

## Shared Binary Core (DRY Principle)

`dawparse` exposes `BufferReader` and `BufferWriter` classes under `shared/` to simplify reading and writing binary files in an extensible way. You can leverage them to build new DAW parsers:

```typescript
import { BufferReader, BufferWriter } from 'dawparse';

const reader = new BufferReader(bytes);
const magic = reader.readString(4);
const channels = reader.readInt16();

const writer = new BufferWriter();
writer.writeString('MAGIC');
writer.writeInt16(2);
const finalBytes = writer.getBuffer();
```

---

## Running Tests

We use [Vitest](https://vitest.dev/) for testing:

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run only ZIP package tests (including real-file test)
npx vitest run test/zip.test.ts
```

---

## Implementing Other DAWs

For details and structural templates on how to implement support for other DAW files (such as Ableton `.als` or Reaper `.RPP`), refer to the [DAW.md](file:///Users/nikitastrike/Development/flbin/DAW.md) documentation guide.

---

## License

MIT
