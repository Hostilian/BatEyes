function uint8ToBase64(u8: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(u8).toString('base64');
  }
  let s = '';
  for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]!);
  return btoa(s);
}

function base64ToUint8(b64: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(b64, 'base64'));
  }
  const bin = atob(b64);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return u8;
}

/**
 * Float32 [-1,1] → little-endian PCM16 Base64 (for native bridge).
 */
export function float32ToPcm16Base64(samples: Float32Array): string {
  const u8 = new Uint8Array(samples.length * 2);
  const view = new DataView(u8.buffer);
  for (let i = 0; i < samples.length; i++) {
    let x = Math.round(samples[i]! * 32767);
    x = Math.max(-32768, Math.min(32767, x));
    view.setInt16(i * 2, x, true);
  }
  return uint8ToBase64(u8);
}

export function pcm16Base64ToFloat32(b64: string): Float32Array {
  const u8 = base64ToUint8(b64);
  const n = Math.floor(u8.length / 2);
  const out = new Float32Array(n);
  const view = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  for (let i = 0; i < n; i++) {
    out[i] = view.getInt16(i * 2, true) / 32768;
  }
  return out;
}
