#!/usr/bin/env node
/**
 * Rebind an mGBA savestate to the identity of another ROM-compatible state.
 *
 * This copies ONLY the 28-byte ROM identity block in the decompressed `gbAs`
 * chunk (CRC/header/title/model, offsets $04..$1f).  The gameplay payload from
 * the source state remains byte-identical.  It is useful for replaying a
 * capture bootstrap made with the USA cartridge against the verified Spain
 * ROM, whose battle code/data is then the code actually executed.
 *
 * Usage:
 *   node rebind-savestate-rom-identity.mjs SOURCE.ss0 IDENTITY.ss0 OUTPUT.ss0
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { deflateSync, inflateSync } from 'node:zlib';

const [, , sourcePath, identityPath, outputPath] = process.argv;
if (!sourcePath || !identityPath || !outputPath) {
  console.error('Usage: rebind-savestate-rom-identity.mjs SOURCE.ss0 IDENTITY.ss0 OUTPUT.ss0');
  process.exit(2);
}

const PNG_SIGNATURE = Buffer.from('89504e470d0a1a0a', 'hex');
const IDENTITY_START = 4;
const IDENTITY_END = 32;

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function parsePng(path) {
  const bytes = readFileSync(path);
  if (!bytes.subarray(0, 8).equals(PNG_SIGNATURE)) throw new Error(`${path}: not an mGBA PNG savestate`);
  const chunks = [];
  let offset = 8;
  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.subarray(offset + 4, offset + 8).toString('ascii');
    const data = Buffer.from(bytes.subarray(offset + 8, offset + 8 + length));
    chunks.push({ type, data });
    offset += 12 + length;
    if (type === 'IEND') break;
  }
  if (!chunks.some((chunk) => chunk.type === 'gbAs')) throw new Error(`${path}: missing gbAs state chunk`);
  return chunks;
}

function statePayload(chunks) {
  const state = chunks.find((chunk) => chunk.type === 'gbAs');
  return inflateSync(state.data);
}

function encodePng(chunks) {
  const encoded = [PNG_SIGNATURE];
  for (const chunk of chunks) {
    const type = Buffer.from(chunk.type, 'ascii');
    const length = Buffer.alloc(4);
    length.writeUInt32BE(chunk.data.length);
    const checksum = Buffer.alloc(4);
    checksum.writeUInt32BE(crc32(Buffer.concat([type, chunk.data])));
    encoded.push(length, type, chunk.data, checksum);
  }
  return Buffer.concat(encoded);
}

const sourceChunks = parsePng(sourcePath);
const identityChunks = parsePng(identityPath);
const sourcePayload = statePayload(sourceChunks);
const identityPayload = statePayload(identityChunks);
if (!sourcePayload.subarray(0, 4).equals(identityPayload.subarray(0, 4))) {
  throw new Error('Savestate core/schema header differs; refusing to rebind');
}

const reboundPayload = Buffer.from(sourcePayload);
identityPayload.copy(reboundPayload, IDENTITY_START, IDENTITY_START, IDENTITY_END);
const reboundChunks = sourceChunks.map((chunk) => chunk.type === 'gbAs'
  ? { ...chunk, data: deflateSync(reboundPayload, { level: 9 }) }
  : chunk);
writeFileSync(outputPath, encodePng(reboundChunks));

const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex');

// Evidence for this tool's own invariant: the gameplay payload must be
// byte-identical OUTSIDE the identity range, and must actually differ INSIDE it.
// The two whole-payload digests can never be equal — the identity bytes are
// replaced by design and the digest covers the whole payload — so digest
// equality is NOT a preservation witness. The out-of-range byte diff is.
let differingBytes = 0;
let differingInsideIdentityRange = 0;
let differingOutsideIdentityRange = 0;
if (sourcePayload.length === reboundPayload.length) {
  for (let i = 0; i < sourcePayload.length; i++) {
    if (sourcePayload[i] === reboundPayload[i]) continue;
    differingBytes++;
    if (i >= IDENTITY_START && i < IDENTITY_END) differingInsideIdentityRange++;
    else differingOutsideIdentityRange++;
  }
}

console.log(JSON.stringify({
  source: sourcePath,
  identity: identityPath,
  output: outputPath,
  sourcePayloadSha256: sha256(sourcePayload),
  reboundPayloadSha256: sha256(reboundPayload),
  identityHex: identityPayload.subarray(IDENTITY_START, IDENTITY_END).toString('hex'),
  payloadPreservation: {
    identityRange: { start: IDENTITY_START, end: IDENTITY_END },
    sourceBytes: sourcePayload.length,
    reboundBytes: reboundPayload.length,
    lengthsEqual: sourcePayload.length === reboundPayload.length,
    differingBytes,
    differingInsideIdentityRange,
    differingOutsideIdentityRange,
  },
}, null, 2));
