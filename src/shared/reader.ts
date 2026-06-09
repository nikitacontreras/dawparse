export class BufferReader {
  private view: DataView;
  private buffer: Uint8Array;
  public offset: number;

  constructor(data: Uint8Array) {
    this.buffer = data;
    this.view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    this.offset = 0;
  }

  get length(): number {
    return this.buffer.length;
  }

  get remaining(): number {
    return this.buffer.length - this.offset;
  }

  readUint8(): number {
    if (this.offset + 1 > this.buffer.length) throw new Error('Buffer overflow');
    return this.buffer[this.offset++];
  }

  readInt8(): number {
    if (this.offset + 1 > this.buffer.length) throw new Error('Buffer overflow');
    return this.view.getInt8(this.offset++);
  }

  readInt16(littleEndian = true): number {
    if (this.offset + 2 > this.buffer.length) throw new Error('Buffer overflow');
    const val = this.view.getInt16(this.offset, littleEndian);
    this.offset += 2;
    return val;
  }

  readUint16(littleEndian = true): number {
    if (this.offset + 2 > this.buffer.length) throw new Error('Buffer overflow');
    const val = this.view.getUint16(this.offset, littleEndian);
    this.offset += 2;
    return val;
  }

  readInt32(littleEndian = true): number {
    if (this.offset + 4 > this.buffer.length) throw new Error('Buffer overflow');
    const val = this.view.getInt32(this.offset, littleEndian);
    this.offset += 4;
    return val;
  }

  readUint32(littleEndian = true): number {
    if (this.offset + 4 > this.buffer.length) throw new Error('Buffer overflow');
    const val = this.view.getUint32(this.offset, littleEndian);
    this.offset += 4;
    return val;
  }

  readFloat32(littleEndian = true): number {
    if (this.offset + 4 > this.buffer.length) throw new Error('Buffer overflow');
    const val = this.view.getFloat32(this.offset, littleEndian);
    this.offset += 4;
    return val;
  }

  readFloat64(littleEndian = true): number {
    if (this.offset + 8 > this.buffer.length) throw new Error('Buffer overflow');
    const val = this.view.getFloat64(this.offset, littleEndian);
    this.offset += 8;
    return val;
  }

  readString(length: number): string {
    if (this.offset + length > this.buffer.length) throw new Error('Buffer overflow');
    let str = '';
    for (let i = 0; i < length; i++) {
      str += String.fromCharCode(this.buffer[this.offset++]);
    }
    return str;
  }

  readBytes(length: number): Uint8Array {
    if (this.offset + length > this.buffer.length) throw new Error('Buffer overflow');
    const bytes = this.buffer.subarray(this.offset, this.offset + length);
    this.offset += length;
    return bytes;
  }

  readVarInt(): number {
    let value = 0;
    let i = 0;
    while (true) {
      const b = this.readUint8();
      value |= (b & 0x7f) << (7 * i);
      if (!(b & 0x80)) {
        break;
      }
      i++;
    }
    return value;
  }
}
