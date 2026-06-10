import * as fs from 'fs';
import { FLPProject } from './types.js';
import { parseFLP } from './parser.js';
import { serializeFLP } from './serializer.js';
import { parseFLPZip } from './zip.js';

export interface FLPOptions {
  file?: string | Uint8Array | ArrayBuffer;
  zip?: string | Uint8Array | ArrayBuffer;
  project?: FLPProject;
}

export class FLP {
  public project!: FLPProject;
  public files?: Record<string, Uint8Array>;
  public flpName?: string;

  constructor(options: FLPOptions) {
    if (options.project !== undefined) {
      this.project = options.project;
    } else if (options.file !== undefined) {
      const data = this.toUint8Array(options.file);
      this.project = parseFLP(data);
    } else if (options.zip !== undefined) {
      const data = this.toUint8Array(options.zip);
      const zipResult = parseFLPZip(data);
      this.project = zipResult.project;
      this.files = zipResult.files;
      this.flpName = zipResult.flpName;
    } else {
      throw new Error('Either "file" or "zip" must be provided in FLP options');
    }
  }

  private toUint8Array(input: string | Uint8Array | ArrayBuffer): Uint8Array {
    if (typeof input === 'string') {
      if (typeof fs !== 'undefined' && fs.readFileSync) {
        try {
          const buf = fs.readFileSync(input);
          return new Uint8Array(buf);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          throw new Error(`Failed to read file at path "${input}": ${message}`);
        }
      } else {
        throw new Error('Reading from local file path is only supported in Node.js environment.');
      }
    } else if (input instanceof ArrayBuffer) {
      return new Uint8Array(input);
    } else if (input instanceof Uint8Array) {
      return input;
    } else {
      throw new Error(
        'Invalid input type. Expected string (file path), Uint8Array, or ArrayBuffer.',
      );
    }
  }

  /**
   * Gets the project tempo/BPM cleanly.
   */
  get bpm(): number {
    let defaultBpm = 130;
    const tempoEvent = this.project.events.find((e) => e.id === 156);
    const coarseTempoEvent = this.project.events.find((e) => e.id === 66);
    const fineTempoEvent = this.project.events.find((e) => e.id === 93);

    if (tempoEvent && typeof tempoEvent.value === 'number') {
      defaultBpm = tempoEvent.value > 1000 ? tempoEvent.value / 1000 : tempoEvent.value;
    } else if (coarseTempoEvent && typeof coarseTempoEvent.value === 'number') {
      const fine = fineTempoEvent && typeof fineTempoEvent.value === 'number' ? fineTempoEvent.value : 0;
      const finePart = fine > 100 ? fine / 1000 : fine / 100;
      defaultBpm = coarseTempoEvent.value + finePart;
    }

    return Math.round(defaultBpm * 10) / 10;
  }

  /**
   * Sets the project tempo/BPM cleanly.
   */
  set bpm(value: number) {
    const tempoVal = Math.round(value * 1000);
    const tempoEvent = this.project.events.find((e) => e.id === 156);
    if (tempoEvent) {
      tempoEvent.value = tempoVal;
      return;
    }

    const coarseTempoEvent = this.project.events.find((e) => e.id === 66);
    if (coarseTempoEvent) {
      coarseTempoEvent.value = Math.floor(value);
      const fineTempoEvent = this.project.events.find((e) => e.id === 93);
      if (fineTempoEvent) {
        fineTempoEvent.value = Math.round((value - Math.floor(value)) * 1000);
      }
      return;
    }

    // Default fallback: push a new Project Tempo dword event
    this.project.events.push({
      id: 156,
      name: 'Project Tempo',
      type: 'dword',
      value: tempoVal,
    });
  }

  /**
   * Serializes the current project state back to a binary Uint8Array.
   */
  public serialize(): Uint8Array {
    return serializeFLP(this.project);
  }
}
