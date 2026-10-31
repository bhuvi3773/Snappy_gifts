export interface DecodedProofPng {
  buffer: Buffer;
  width: number;
  height: number;
}

export const MAX_PROOF_BYTES = 5 * 1024 * 1024; // 5 MB decoded binary limit
export const PNG_DATA_URL_PREFIX = 'data:image/png;base64,';

// 5MB binary = 5,242,880 bytes -> Math.ceil(5242880 / 3) * 4 = 6,990,508 base64 chars + 22 prefix + 4 padding
export const MAX_ENCODED_PROOF_CHARS = PNG_DATA_URL_PREFIX.length + Math.ceil(MAX_PROOF_BYTES / 3) * 4 + 4;

/**
 * Strictly validates and decodes a client-supplied preview proof PNG data URL.
 * Enforces:
 * - Data URL format (data:image/png;base64,...)
 * - Pre-allocation / pre-regex string length limit (prevents memory/CPU exhaustion)
 * - Complete base64 character set validation
 * - Maximum file size <= 5MB
 * - Authentic 8-byte PNG signature (0x89 0x50 0x4e 0x47 0x0d 0x0a 0x1a 0x0a)
 * - Valid IHDR chunk header with width and height bounds (50x50 to 4000x4000)
 * - Safe pixel limits and structural integrity (IDAT and IEND chunk presence)
 */
export function validateAndDecodeProofDataUrl(
  dataUrl: unknown,
  ErrorClass: new (msg: string) => Error = Error
): DecodedProofPng {
  if (typeof dataUrl !== 'string' || !dataUrl.trim()) {
    throw new ErrorClass('Invalid proof image: data URL must be a non-empty string.');
  }

  const trimmed = dataUrl.trim();
  if (!trimmed.startsWith(PNG_DATA_URL_PREFIX)) {
    throw new ErrorClass('Invalid proof image: data URL must be a base64-encoded PNG (data:image/png;base64,...).');
  }

  // Pre-allocation size guard: reject oversized payloads early
  if (trimmed.length > MAX_ENCODED_PROOF_CHARS) {
    throw new ErrorClass('Proof PNG image exceeds maximum size limit of 5MB.');
  }

  const base64Data = trimmed.slice(PNG_DATA_URL_PREFIX.length);
  if (!base64Data || !/^[A-Za-z0-9+/=]+$/.test(base64Data)) {
    throw new ErrorClass('Invalid proof image: malformed base64 content.');
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(base64Data, 'base64');
  } catch {
    throw new ErrorClass('Invalid proof image: base64 decoding failed.');
  }

  if (buffer.length > MAX_PROOF_BYTES) {
    throw new ErrorClass(`Proof PNG image exceeds maximum size limit of 5MB (${buffer.length} bytes).`);
  }

  if (buffer.length < 33) {
    throw new ErrorClass('Malformed proof PNG image: file too small or missing header.');
  }

  // 1. Validate 8-byte PNG signature
  const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let i = 0; i < 8; i++) {
    if (buffer[i] !== PNG_SIGNATURE[i]) {
      throw new ErrorClass('Invalid proof image: file is not a genuine PNG binary (signature mismatch).');
    }
  }

  // 2. First chunk must be IHDR (length 13, type 'IHDR')
  const ihdrLength = buffer.readUInt32BE(8);
  if (ihdrLength !== 13) {
    throw new ErrorClass('Malformed proof PNG image: invalid IHDR chunk length.');
  }
  const ihdrType = buffer.toString('ascii', 12, 16);
  if (ihdrType !== 'IHDR') {
    throw new ErrorClass('Malformed proof PNG image: missing IHDR header chunk.');
  }

  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  const bitDepth = buffer[24];
  const colorType = buffer[25];

  const MIN_DIM = 50;
  const MAX_DIM = 4000;
  if (width < MIN_DIM || height < MIN_DIM) {
    throw new ErrorClass(`Proof PNG dimensions are too small (${width}x${height}px; minimum is ${MIN_DIM}x${MIN_DIM}px).`);
  }
  if (width > MAX_DIM || height > MAX_DIM) {
    throw new ErrorClass(`Proof PNG dimensions exceed allowable limits (${width}x${height}px; maximum is ${MAX_DIM}x${MAX_DIM}px).`);
  }

  const validBitDepths = [1, 2, 4, 8, 16];
  const validColorTypes = [0, 2, 3, 4, 6];
  if (!validBitDepths.includes(bitDepth) || !validColorTypes.includes(colorType)) {
    throw new ErrorClass('Malformed proof PNG image: invalid color or bit depth encoding.');
  }

  // 3. Scan chunks to verify presence of IDAT and IEND
  let offset = 8;
  let hasIdat = false;
  let hasIend = false;

  while (offset < buffer.length) {
    if (offset + 8 > buffer.length) {
      throw new ErrorClass('Malformed proof PNG image: truncated chunk header.');
    }
    const chunkLength = buffer.readUInt32BE(offset);
    const chunkType = buffer.toString('ascii', offset + 4, offset + 8);

    if (!/^[A-Za-z]{4}$/.test(chunkType)) {
      throw new ErrorClass(`Malformed proof PNG image: invalid chunk type "${chunkType}".`);
    }

    if (offset + 12 + chunkLength > buffer.length) {
      throw new ErrorClass(`Malformed proof PNG image: chunk "${chunkType}" truncated.`);
    }

    if (chunkType === 'IDAT') {
      hasIdat = true;
    } else if (chunkType === 'IEND') {
      hasIend = true;
      break;
    }

    offset += 12 + chunkLength;
  }

  if (!hasIdat) {
    throw new ErrorClass('Malformed proof PNG image: missing IDAT image data.');
  }
  if (!hasIend) {
    throw new ErrorClass('Malformed proof PNG image: missing IEND termination chunk.');
  }

  return { buffer, width, height };
}
