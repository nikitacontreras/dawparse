export * as flstudio from './flstudio/index.js';

// Backward compatibility exports
export { parseFLP, serializeFLP, parseFLPZip } from './flstudio/index.js';
export * from './flstudio/types.js';
export * from './flstudio/events.js';
export { FLPZipResult } from './flstudio/zip.js';
export { FLP, FLPOptions } from './flstudio/index.js';
export { BufferReader } from './shared/reader.js';
export { BufferWriter } from './shared/writer.js';
