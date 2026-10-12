/**
 * Zero-dependency In-Memory ZIP Packager
 * Generates valid standard PKZIP archives for game patches without external libraries.
 */

// CRC32 Lookup Table
const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[i] = c;
}

function calculateCrc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export interface ZipFileInput {
  path: string;
  content: string | Uint8Array;
}

/**
 * Builds a ZIP archive Uint8Array from a list of files
 */
export function buildZipArchive(files: ZipFileInput[]): Uint8Array {
  const encoder = new TextEncoder();
  const fileRecords: {
    nameBytes: Uint8Array;
    dataBytes: Uint8Array;
    crc32: number;
    offset: number;
  }[] = [];

  const chunks: Uint8Array[] = [];
  let currentOffset = 0;

  // 1. Write Local File Headers + Data
  for (const file of files) {
    const nameBytes = encoder.encode(file.path.replace(/\\/g, '/'));
    const dataBytes =
      typeof file.content === 'string' ? encoder.encode(file.content) : file.content;
    const crc = calculateCrc32(dataBytes);
    const size = dataBytes.length;

    const localHeader = new Uint8Array(30 + nameBytes.length);
    const view = new DataView(localHeader.buffer);

    view.setUint32(0, 0x04034b50, true); // Local file header signature PK\x03\x04
    view.setUint16(4, 20, true); // Version needed (2.0)
    view.setUint16(6, 0x0800, true); // UTF-8 filename flag
    view.setUint16(8, 0, true); // Compression method: 0 (Store)
    view.setUint16(10, 0, true); // File mod time
    view.setUint16(12, 0, true); // File mod date
    view.setUint32(14, crc, true); // CRC-32
    view.setUint32(18, size, true); // Compressed size
    view.setUint32(22, size, true); // Uncompressed size
    view.setUint16(26, nameBytes.length, true); // Filename length
    view.setUint16(28, 0, true); // Extra field length

    localHeader.set(nameBytes, 30);

    chunks.push(localHeader);
    chunks.push(dataBytes);

    fileRecords.push({
      nameBytes,
      dataBytes,
      crc32: crc,
      offset: currentOffset,
    });

    currentOffset += localHeader.length + dataBytes.length;
  }

  const centralDirStartOffset = currentOffset;
  let centralDirSize = 0;

  // 2. Write Central Directory Headers
  for (const rec of fileRecords) {
    const header = new Uint8Array(46 + rec.nameBytes.length);
    const view = new DataView(header.buffer);

    view.setUint32(0, 0x02014b50, true); // Central directory header signature PK\x01\x02
    view.setUint16(4, 20, true); // Version made by
    view.setUint16(6, 20, true); // Version needed
    view.setUint16(8, 0x0800, true); // UTF-8 flag
    view.setUint16(10, 0, true); // Store
    view.setUint16(12, 0, true); // Mod time
    view.setUint16(14, 0, true); // Mod date
    view.setUint32(16, rec.crc32, true); // CRC-32
    view.setUint32(20, rec.dataBytes.length, true); // Compressed size
    view.setUint32(24, rec.dataBytes.length, true); // Uncompressed size
    view.setUint16(28, rec.nameBytes.length, true); // Filename length
    view.setUint16(30, 0, true); // Extra field length
    view.setUint16(32, 0, true); // Comment length
    view.setUint16(34, 0, true); // Disk number start
    view.setUint16(36, 0, true); // Internal attributes
    view.setUint32(38, 0, true); // External attributes
    view.setUint32(42, rec.offset, true); // Relative offset of local header

    header.set(rec.nameBytes, 46);

    chunks.push(header);
    centralDirSize += header.length;
    currentOffset += header.length;
  }

  // 3. Write End of Central Directory Record (EOCD)
  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);

  eocdView.setUint32(0, 0x06054b50, true); // EOCD signature PK\x05\x06
  eocdView.setUint16(4, 0, true); // Disk number
  eocdView.setUint16(6, 0, true); // Disk with central dir
  eocdView.setUint16(8, fileRecords.length, true); // Records on this disk
  eocdView.setUint16(10, fileRecords.length, true); // Total records
  eocdView.setUint32(12, centralDirSize, true); // Size of central directory
  eocdView.setUint32(16, centralDirStartOffset, true); // Offset of start of central directory
  eocdView.setUint16(20, 0, true); // Comment length

  chunks.push(eocd);

  // Combine chunks into single Uint8Array
  const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
  const result = new Uint8Array(totalLength);
  let pos = 0;
  for (const chunk of chunks) {
    result.set(chunk, pos);
    pos += chunk.length;
  }

  return result;
}
