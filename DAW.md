# Implementing a New DAW in `dawparse`

This document defines the architecture and requirements for adding support for new Digital Audio Workstations (DAWs) to `dawparse`. 

To ensure the library remains **consistent**, **scalable**, and **DRY**, all DAW implementations must follow the rules described below.

---

## 1. Directory Structure

Each DAW format must have its own isolated folder under `src/`. For example, to add Ableton Live (`.als` / `.adg`) support:

```text
src/
├── shared/              # Shared binary reader/writer
│   ├── reader.ts
│   └── writer.ts
├── flstudio/            # FL Studio format module
│   ├── class.ts
│   ├── parser.ts
│   ├── serializer.ts
│   ├── types.ts
│   └── index.ts
├── ableton/             # [NEW] Ableton Live format module
│   ├── class.ts         # Main ALS class wrapper
│   ├── parser.ts        # Internal binary parsing logic
│   ├── serializer.ts    # Internal serialization logic
│   ├── types.ts         # TypeScript definitions
│   └── index.ts         # Exposes ONLY the public OOP API
```

---

## 2. API Design Rules

### Rule 1: No Low-Level Functional Exports
Individual functions like `parseFLP` or `serializeFLP` (and their equivalents like `parseALS`, `serializeALS`) must **not** be exported in the main `dawparse` entrypoint. They must remain internal implementation details inside their respective subfolders.

### Rule 2: Clean OOP Interface
Each DAW must expose a unified Object-Oriented class wrapper. A developer should interact with a DAW format using the following class instantiation syntax:

```typescript
import { ALS } from 'dawparse';

// Instantiating from a path or buffer
const project = new ALS({
  file: './my_project.als'
});

// Or from a zipped package if supported
const zippedProject = new ALS({
  zip: './my_zipped_project.alp'
});

// Access parsed properties
console.log(project.project.tracks);

// Serialize back to raw bytes
const outputBytes = project.serialize();
```

---

## 3. Template for a New DAW Class

Here is a template implementation for the `class.ts` file of a new DAW:

```typescript
import * as fs from 'fs';
import { parseALS } from './parser.js';
import { serializeALS } from './serializer.js';
import { ALSProject } from './types.js';

export interface ALSOptions {
  file?: string | Uint8Array | ArrayBuffer;
  zip?: string | Uint8Array | ArrayBuffer;
  project?: ALSProject; // Support wrapping pre-created projects
}

export class ALS {
  public project!: ALSProject;
  public files?: Record<string, Uint8Array>;
  public alsName?: string;

  constructor(options: ALSOptions) {
    if (options.project !== undefined) {
      this.project = options.project;
    } else if (options.file !== undefined) {
      const data = this.toUint8Array(options.file);
      this.project = parseALS(data);
    } else if (options.zip !== undefined) {
      // Decompress zip first, retrieve ALS file
      // const zipResult = parseALSZip(data);
      // this.project = zipResult.project;
      // this.files = zipResult.files;
      // this.alsName = zipResult.alsName;
    } else {
      throw new Error('Either "file", "zip", or "project" must be provided.');
    }
  }

  private toUint8Array(input: string | Uint8Array | ArrayBuffer): Uint8Array {
    if (typeof input === 'string') {
      if (typeof fs !== 'undefined' && fs.readFileSync) {
        return new Uint8Array(fs.readFileSync(input));
      }
      throw new Error('Local path reading is only supported in Node.js.');
    }
    return input instanceof ArrayBuffer ? new Uint8Array(input) : input;
  }

  /**
   * Compiles the current project structure back into raw DAW binary format.
   */
  public serialize(): Uint8Array {
    return serializeALS(this.project);
  }
}
```

---

## 4. Re-using the Shared Binary Core (DRY Principle)

When writing your DAW's parser and serializer, **do not** write custom byte-tracking code. Use the centralized binary helpers under `src/shared/`:

- **`BufferReader`**: Simplifies reading numeric types, strings, bytes, and LEB128 VarInts.
- **`BufferWriter`**: Provides a dynamically growing byte stream with high-performance serialization methods.

Example using the core inside your parser:
```typescript
import { BufferReader } from '../shared/reader.js';

export function parseALS(data: Uint8Array): ALSProject {
  const reader = new BufferReader(data);
  const magic = reader.readString(4);
  const trackCount = reader.readInt32();
  
  // parser logic...
}
```
