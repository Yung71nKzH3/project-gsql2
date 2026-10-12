import { DatabaseState } from '../types/database';

/**
 * Packs a DatabaseState JSON into a compressed Base64URL string using CompressionStream (deflate-raw).
 * Falls back to URI encoding if CompressionStream is not available.
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
      
      // Convert to binary string chunked to prevent stack overflow
      let binary = '';
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      
      // Standard base64 to base64url
      const base64 = btoa(binary);
      const base64url = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      return `data=c:${base64url}`;
    } catch (e) {
      console.warn('CompressionStream failed, falling back to base64url:', e);
    }
  }

  // Fallback: utf-8 base64url
  try {
    const encoded = encodeURIComponent(jsonStr);
    const base64 = btoa(unescape(encoded));
    const base64url = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return `data=u:${base64url}`;
  } catch (e) {
    return `data=raw:${encodeURIComponent(jsonStr)}`;
  }
}

/**
 * Deserializes state from hash (accepts either "#data=..." or "data=...")
 */
export async function deserializeHashToState(hash: string): Promise<DatabaseState | null> {
  try {
    let clean = hash.trim();
    if (clean.startsWith('#')) {
      clean = clean.slice(1);
    }
    if (!clean.startsWith('data=')) {
      // Maybe format is just the payload or data query
      const match = clean.match(/data=([^&]+)/);
      if (match) {
        clean = `data=${match[1]}`;
      } else {
        return null;
      }
    }

    const payload = clean.slice('data='.length);
    if (!payload) return null;

    if (payload.startsWith('c:')) {
      const base64url = payload.slice(2);
      // Restore standard base64
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
        return JSON.parse(jsonStr) as DatabaseState;
      }
    } else if (payload.startsWith('u:')) {
      const base64url = payload.slice(2);
      let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
      while (base64.length % 4) {
        base64 += '=';
      }
      const binary = atob(base64);
      const jsonStr = decodeURIComponent(escape(binary));
      return JSON.parse(jsonStr) as DatabaseState;
    } else if (payload.startsWith('raw:')) {
      const raw = payload.slice(4);
      return JSON.parse(decodeURIComponent(raw)) as DatabaseState;
    } else {
      // Legacy or plain base64url without prefix check
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
          return JSON.parse(jsonStr) as DatabaseState;
        }
      } catch {
        // try direct json or unescape
        const binary = atob(base64);
        const jsonStr = decodeURIComponent(escape(binary));
        return JSON.parse(jsonStr) as DatabaseState;
      }
    }
  } catch (err) {
    console.error('Failed to deserialize hash to state:', err);
    return null;
  }
  return null;
}
