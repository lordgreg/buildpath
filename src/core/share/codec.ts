import type { Rule } from '../filter/types.ts';
import { shapeRules } from '../rules/sanitize.ts';

export const SHARE_CODE_LIMIT = 8000;

/** A share code longer than this cannot come from the builder. */
export const MAX_CODE_LENGTH = 64_000;

/** A decoded payload larger than this is treated as hostile, not as a build. */
export const MAX_PAYLOAD_BYTES = 256 * 1024;

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
  /** User rules only; the preset is regenerated. */
  customRules?: Rule[];
  /** Legacy rules-only payload. */
  rules?: Rule[];
}

const RULE_KEYS = ['rules', 'customRules', 'baseRules', 'editedRules'] as const;

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

function concat(chunks: readonly Uint8Array[], length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

/**
 * Decompresses a deflate-raw payload, refusing to grow past `MAX_PAYLOAD_BYTES`
 * so a small hostile code cannot exhaust memory.
 */
async function inflateBounded(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes as unknown as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream('deflate-raw'));
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    length += value.byteLength;
    if (length > MAX_PAYLOAD_BYTES) {
      await reader.cancel();
      throw new Error('Share code is too large');
    }
    chunks.push(value);
  }

  return concat(chunks, length);
}

async function deflate(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes as unknown as BlobPart])
    .stream()
    .pipeThrough(new CompressionStream('deflate-raw'));
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
    code = `d1.${bytesToBase64Url(await deflate(json))}`;
  }

  return { code, tooLarge: code.length > SHARE_CODE_LIMIT };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Decodes a share code. The envelope is validated, decompression is bounded and
 * every rule array is structurally sanitised, so a caller never has to trust a
 * pasted code. It never throws on a bad rule: `shapeRules` repairs or disables
 * it instead.
 */
export async function decodeShare(code: string): Promise<SharePayload> {
  const trimmed = code.trim();
  if (trimmed.length > MAX_CODE_LENGTH) {
    throw new Error('Share code is too large');
  }

  const [prefix, data] = [trimmed.slice(0, 3), trimmed.slice(3)];

  let bytes: Uint8Array;
  if (prefix === 'd1.') {
    if (typeof DecompressionStream === 'undefined') {
      throw new Error('This browser cannot decompress share codes');
    }
    bytes = await inflateBounded(base64UrlToBytes(data));
  } else if (prefix === 'r1.') {
    bytes = base64UrlToBytes(data);
    if (bytes.byteLength > MAX_PAYLOAD_BYTES) {
      throw new Error('Share code is too large');
    }
  } else {
    throw new Error('Unknown share code format');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(decoder.decode(bytes));
  } catch {
    throw new Error('Invalid share code');
  }
  if (!isPlainObject(parsed) || parsed.v !== 1) {
    throw new Error('Invalid share code');
  }

  const payload = parsed as unknown as SharePayload;
  const present = RULE_KEYS.filter((key) => key in payload);
  if (present.length === 0 && !payload.state) {
    throw new Error('Invalid share code');
  }

  for (const key of present) {
    payload[key] = shapeRules(payload[key]).rules;
  }

  return payload;
}
