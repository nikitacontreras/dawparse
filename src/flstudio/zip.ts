import { unzipSync } from 'fflate';
import { parseFLP } from './parser.js';
import { FLPProject } from './types.js';

export interface FLPZipResult {
  project: FLPProject;
  flpName: string;
  files: Record<string, Uint8Array>;
}

/**
 * Parses an FL Studio zipped loop package (.zip) containing an FLP project file
 * and its associated sample/audio files.
 *
 * @param zipData The binary contents of the .zip file
 * @returns An object containing the parsed FLP project, the name of the FLP file, and a dictionary of all files inside the zip
 */
export function parseFLPZip(zipData: Uint8Array): FLPZipResult {
  let decompressed: Record<string, Uint8Array>;
  try {
    decompressed = unzipSync(zipData);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to decompress ZIP archive: ${message}`);
  }

  const entries = Object.entries(decompressed);
  const flpFileEntry = entries.find(([filename]) => filename.toLowerCase().endsWith('.flp'));

  if (!flpFileEntry) {
    throw new Error('No .flp project file found inside the ZIP archive');
  }

  const [flpName, flpBytes] = flpFileEntry;
  const project = parseFLP(flpBytes);

  return {
    project,
    flpName,
    files: decompressed,
  };
}
