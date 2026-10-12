import { DatabaseState } from '../types/database';

/**
 * Computes a fast, deterministic 32-bit FNV-1a checksum of the payload bytes or string,
 * returned as an 8-character hex string.
 */
export function computeChecksum(str: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    // 32-bit FNV prime multiply: hash * 16777619
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export interface DeserializationResult {
  state: DatabaseState | null;
  isValidChecksum: boolean;
  isTruncated: boolean;
}

/**
 * Packs a DatabaseState JSON into a compressed Base64URL string with a checksum suffix (.k:<hex>).
 * Example: data=c:<base64url>.k:3fa8e1b2
 */
export async function serializeStateToHash(state: DatabaseState): Promise<string> {
  const jsonStr = JSON.stringify(state);

  if (typeof CompressionStream !== 'undefined') {
    try {
      const stream = new Blob([jsonStr]).stream();
      const compressedStream = stream.pipeThrough(new CompressionStream('deflate-raw'));
      const response = new Response(compressedStream);
      const buffer = await response.arrayBuffer();
      const bytes = new Uint8Array(buffer);

      let binary = '';
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }

      const base64 = btoa(binary);
      const base64url = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      const checksum = computeChecksum(base64url);
      return `data=c:${base64url}.k:${checksum}`;
    } catch (e) {
      console.warn('CompressionStream failed, falling back:', e);
    }
  }

  // Fallback: utf-8 base64url
  try {
    const encoded = encodeURIComponent(jsonStr);
    const base64 = btoa(unescape(encoded));
    const base64url = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const checksum = computeChecksum(base64url);
    return `data=u:${base64url}.k:${checksum}`;
  } catch {
    const raw = encodeURIComponent(jsonStr);
    const checksum = computeChecksum(raw);
    return `data=raw:${raw}.k:${checksum}`;
  }
}

/**
 * Deserializes state from hash (accepts either "#data=..." or "data=...").
 * Verifies checksum if present; flags truncation or corruption cleanly.
 */
export async function deserializeHashToState(
  hash: string
): Promise<DatabaseState | null> {
  const result = await deserializeHashWithVerification(hash);
  return result.state;
}

export async function deserializeHashWithVerification(
  hash: string
): Promise<DeserializationResult> {
  try {
    let clean = hash.trim();
    if (clean.startsWith('#')) {
      clean = clean.slice(1);
    }
    if (!clean.startsWith('data=')) {
      const match = clean.match(/data=([^&]+)/);
      if (match) {
        clean = `data=${match[1]}`;
      } else {
        return { state: null, isValidChecksum: false, isTruncated: true };
      }
    }

    let payload = clean.slice('data='.length);
    if (!payload) return { state: null, isValidChecksum: false, isTruncated: true };

    // Checksum check: look for `.k:<checksum>` suffix
    let expectedChecksum: string | null = null;
    const checksumIndex = payload.lastIndexOf('.k:');
    if (checksumIndex !== -1) {
      expectedChecksum = payload.slice(checksumIndex + 3);
      payload = payload.slice(0, checksumIndex);
    }

    let actualChecksum: string | null = null;

    if (payload.startsWith('c:')) {
      const base64url = payload.slice(2);
      if (expectedChecksum) {
        actualChecksum = computeChecksum(base64url);
        if (actualChecksum !== expectedChecksum) {
          console.warn('UrlBase: Checksum mismatch or truncated URL detected!', {
            expected: expectedChecksum,
            actual: actualChecksum,
          });
          return { state: null, isValidChecksum: false, isTruncated: true };
        }
      }

      let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
      while (base64.length % 4) {
        base64 += '=';
      }
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      if (typeof DecompressionStream !== 'undefined') {
        const stream = new Blob([bytes]).stream();
        const decompressedStream = stream.pipeThrough(new DecompressionStream('deflate-raw'));
        const response = new Response(decompressedStream);
        const jsonStr = await response.text();
        const parsed = JSON.parse(jsonStr) as DatabaseState;
        return { state: parsed, isValidChecksum: true, isTruncated: false };
      }
    } else if (payload.startsWith('u:')) {
      const base64url = payload.slice(2);
      if (expectedChecksum) {
        actualChecksum = computeChecksum(base64url);
        if (actualChecksum !== expectedChecksum) {
          return { state: null, isValidChecksum: false, isTruncated: true };
        }
      }

      let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
      while (base64.length % 4) {
        base64 += '=';
      }
      const binary = atob(base64);
      const jsonStr = decodeURIComponent(escape(binary));
      const parsed = JSON.parse(jsonStr) as DatabaseState;
      return { state: parsed, isValidChecksum: true, isTruncated: false };
    } else if (payload.startsWith('raw:')) {
      const raw = payload.slice(4);
      if (expectedChecksum) {
        actualChecksum = computeChecksum(raw);
        if (actualChecksum !== expectedChecksum) {
          return { state: null, isValidChecksum: false, isTruncated: true };
        }
      }
      const parsed = JSON.parse(decodeURIComponent(raw)) as DatabaseState;
      return { state: parsed, isValidChecksum: true, isTruncated: false };
    } else {
      // Legacy backwards-compatibility without prefixes
      let base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      while (base64.length % 4) {
        base64 += '=';
      }
      try {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        if (typeof DecompressionStream !== 'undefined') {
          const stream = new Blob([bytes]).stream();
          const decompressedStream = stream.pipeThrough(new DecompressionStream('deflate-raw'));
          const response = new Response(decompressedStream);
          const jsonStr = await response.text();
          const parsed = JSON.parse(jsonStr) as DatabaseState;
          return { state: parsed, isValidChecksum: true, isTruncated: false };
        }
      } catch {
        const binary = atob(base64);
        const jsonStr = decodeURIComponent(escape(binary));
        const parsed = JSON.parse(jsonStr) as DatabaseState;
        return { state: parsed, isValidChecksum: true, isTruncated: false };
      }
    }
  } catch (err) {
    console.error('Failed to deserialize hash to state:', err);
    return { state: null, isValidChecksum: false, isTruncated: true };
  }

  return { state: null, isValidChecksum: false, isTruncated: false };
}
