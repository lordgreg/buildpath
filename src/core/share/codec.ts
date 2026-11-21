import type { Rule } from '../filter/types.ts';

export const SHARE_CODE_LIMIT = 8000;

export interface SharePayload {
  v: 1;
  label: string;
  presetVersion: string;
  /** Whole build state (mode, selection, phase, strictness, theme). */
  state?: unknown;
  /** Generated rules at save time. */
  baseRules?: Rule[];
  /** Edited rules at save time. */
  editedRules?: Rule[];
  /** Legacy rules-only payload. */
  rules?: Rule[];
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, '='));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function pipe(
  bytes: Uint8Array,
  transform: CompressionStream | DecompressionStream,
): Promise<Uint8Array> {
  const stream = new Blob([bytes as unknown as BlobPart]).stream().pipeThrough(transform);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Returns a prefixed, base64url share code. */
export async function encodeShare(
  payload: SharePayload,
): Promise<{ code: string; tooLarge: boolean }> {
  const json = encoder.encode(JSON.stringify(payload));
  let code: string;

  if (typeof CompressionStream === 'undefined') {
    code = `r1.${bytesToBase64Url(json)}`;
  } else {
    code = `d1.${bytesToBase64Url(await pipe(json, new CompressionStream('deflate-raw')))}`;
  }

  return { code, tooLarge: code.length > SHARE_CODE_LIMIT };
}

export async function decodeShare(code: string): Promise<SharePayload> {
  const trimmed = code.trim();
  const [prefix, data] = [
    trimmed.slice(0, 3),
    trimmed.slice(3),
  ];

  let bytes: Uint8Array;
  if (prefix === 'd1.') {
    if (typeof DecompressionStream === 'undefined') {
      throw new Error('This browser cannot decompress share codes');
    }
    bytes = await pipe(
      base64UrlToBytes(data),
      new DecompressionStream('deflate-raw'),
    );
  } else if (prefix === 'r1.') {
    bytes = base64UrlToBytes(data);
  } else {
    throw new Error('Unknown share code format');
  }

  const payload = JSON.parse(decoder.decode(bytes)) as SharePayload;
  if (payload.v !== 1) throw new Error('Invalid share code');
  const hasRules =
    Array.isArray(payload.rules) ||
    Array.isArray(payload.baseRules) ||
    Array.isArray(payload.editedRules);
  if (!hasRules && !payload.state) {
    throw new Error('Invalid share code');
  }
  return payload;
}