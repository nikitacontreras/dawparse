export class BufferWriter {
  private buffer: Uint8Array;
  public offset: number;

  constructor(initialCapacity = 1024) {
    this.buffer = new Uint8Array(initialCapacity);
    this.offset = 0;
  }

  private ensureCapacity(size: number) {
    if (this.offset + size > this.buffer.length) {
      let newCapacity = this.buffer.length * 2;
      while (this.offset + size > newCapacity) {
        newCapacity *= 2;
      }
      const newBuffer = new Uint8Array(newCapacity);
      newBuffer.set(this.buffer);
      this.buffer = newBuffer;
    }
  }

  writeUint8(val: number) {
    this.ensureCapacity(1);
    this.buffer[this.offset++] = val;
  }

  writeInt8(val: number) {
    this.ensureCapacity(1);
    const view = new DataView(this.buffer.buffer, this.buffer.byteOffset, this.buffer.byteLength);
    view.setInt8(this.offset++, val);
  }

  writeInt16(val: number, littleEndian = true) {
    this.ensureCapacity(2);
    const view = new DataView(this.buffer.buffer, this.buffer.byteOffset, this.buffer.byteLength);
    view.setInt16(this.offset, val, littleEndian);
    this.offset += 2;
  }

  writeUint16(val: number, littleEndian = true) {
    this.ensureCapacity(2);
    const view = new DataView(this.buffer.buffer, this.buffer.byteOffset, this.buffer.byteLength);
    view.setUint16(this.offset, val, littleEndian);
    this.offset += 2;
  }

  writeInt32(val: number, littleEndian = true) {
    this.ensureCapacity(4);
    const view = new DataView(this.buffer.buffer, this.buffer.byteOffset, this.buffer.byteLength);
    view.setInt32(this.offset, val, littleEndian);
    this.offset += 4;
  }

  writeUint32(val: number, littleEndian = true) {
    this.ensureCapacity(4);
    const view = new DataView(this.buffer.buffer, this.buffer.byteOffset, this.buffer.byteLength);
    view.setUint32(this.offset, val, littleEndian);
    this.offset += 4;
  }

  writeFloat32(val: number, littleEndian = true) {
    this.ensureCapacity(4);
    const view = new DataView(this.buffer.buffer, this.buffer.byteOffset, this.buffer.byteLength);
    view.setFloat32(this.offset, val, littleEndian);
    this.offset += 4;
  }

  writeFloat64(val: number, littleEndian = true) {
    this.ensureCapacity(8);
    const view = new DataView(this.buffer.buffer, this.buffer.byteOffset, this.buffer.byteLength);
    view.setFloat64(this.offset, val, littleEndian);
    this.offset += 8;
  }

  writeString(val: string) {
    this.ensureCapacity(val.length);
    for (let i = 0; i < val.length; i++) {
      this.buffer[this.offset++] = val.charCodeAt(i);
    }
  }

  writeBytes(bytes: Uint8Array) {
    this.ensureCapacity(bytes.length);
    this.buffer.set(bytes, this.offset);
    this.offset += bytes.length;
  }

  writeVarInt(val: number) {
    let temp = val;
    while (true) {
      let b = temp & 0x7f;
      temp >>>= 7;
      if (temp !== 0) {
        b |= 0x80;
        this.writeUint8(b);
      } else {
        this.writeUint8(b);
        break;
      }
    }
  }

  getBuffer(): Uint8Array {
    return this.buffer.subarray(0, this.offset);
  }
}
