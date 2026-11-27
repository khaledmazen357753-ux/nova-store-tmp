/**
 * SHA-256 + HMAC-SHA256 متزامنان في المتصفح.
 *
 * لماذا لا نستخدم Web Crypto؟
 *   لأن كود الخادم يستخدم hashPassword() بشكل متزامن (مقارنة كلمة المرور عند
 *   الدخول، وإنشاء المستخدمين). Web Crypto يعيد Promise فقط، فكان ذلك
 *   سيفرض تعديل ملفات الخادم — وهو ما نرفضه تماماً.
 *
 * هذه الدالة تُنتج نفس بايتات `crypto.createHmac('sha256', SECRET)` حرفياً،
 * ولذلك يظل التوكن وكلمات المرور متوافقة بين النسخة الأوفلاين والسحابية.
 */

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

const rotr = (x: number, n: number) => ((x >>> n) | (x << (32 - n))) >>> 0;

function sha256(msg: Uint8Array): Uint8Array {
  const len = msg.length;
  const blocks = Math.ceil((len + 9) / 64);
  const total = blocks * 64;
  const buf = new Uint8Array(total);
  buf.set(msg);
  buf[len] = 0x80;

  const dv = new DataView(buf.buffer);
  // طول الرسالة بالبِتات، 64-بت big-endian
  dv.setUint32(total - 8, Math.floor((len * 8) / 0x100000000));
  dv.setUint32(total - 4, (len * 8) >>> 0);

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  const w = new Uint32Array(64);

  for (let i = 0; i < total; i += 64) {
    for (let t = 0; t < 16; t += 1) w[t] = dv.getUint32(i + t * 4);
    for (let t = 16; t < 64; t += 1) {
      const a15 = w[t - 15];
      const a2 = w[t - 2];
      const s0 = (rotr(a15, 7) ^ rotr(a15, 18) ^ (a15 >>> 3)) >>> 0;
      const s1 = (rotr(a2, 17) ^ rotr(a2, 19) ^ (a2 >>> 10)) >>> 0;
      w[t] = (w[t - 16] + s0 + w[t - 7] + s1) >>> 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let t = 0; t < 64; t += 1) {
      const S1 = (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) >>> 0;
      const ch = ((e & f) ^ (~e & g)) >>> 0;
      const temp1 = (h + S1 + ch + K[t] + w[t]) >>> 0;
      const S0 = (rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) >>> 0;
      const maj = ((a & b) ^ (a & c) ^ (b & c)) >>> 0;
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  const out = new Uint8Array(32);
  const odv = new DataView(out.buffer);
  odv.setUint32(0, h0);
  odv.setUint32(4, h1);
  odv.setUint32(8, h2);
  odv.setUint32(12, h3);
  odv.setUint32(16, h4);
  odv.setUint32(20, h5);
  odv.setUint32(24, h6);
  odv.setUint32(28, h7);
  return out;
}

const encoder = new TextEncoder();

export function utf8(str: string): Uint8Array {
  return encoder.encode(str);
}

/** HMAC-SHA256 — نفس ناتج node:crypto */
export function hmacSha256(keyBytes: Uint8Array, msgBytes: Uint8Array): Uint8Array {
  const blockSize = 64;
  let key = keyBytes;
  if (key.length > blockSize) key = sha256(key);
  const padded = new Uint8Array(blockSize);
  padded.set(key);

  const ipad = new Uint8Array(blockSize);
  const opad = new Uint8Array(blockSize);
  for (let i = 0; i < blockSize; i += 1) {
    ipad[i] = padded[i] ^ 0x36;
    opad[i] = padded[i] ^ 0x5c;
  }

  const inner = new Uint8Array(blockSize + msgBytes.length);
  inner.set(ipad);
  inner.set(msgBytes, blockSize);

  const innerHash = sha256(inner);
  const outer = new Uint8Array(blockSize + 32);
  outer.set(opad);
  outer.set(innerHash, blockSize);

  return sha256(outer);
}

/**
 * يفكّ ترميز UTF-8 إلى نص.
 *
 * الغرض: Buffer.toString() بلا ترميز تعني utf8. وبلا هذه الدالة كانت
 * أي محاولة لقراءة محتوى Buffer كنص تفشل بـ "fromUtf8 is not a function".
 */
export function fromUtf8(bytes: Uint8Array): string {
  let out = '';
  let i = 0;
  while (i < bytes.length) {
    const b0 = bytes[i++];
    let cp = b0;
    if (b0 > 0x7f) {
      if (b0 >> 5 === 0x6) {
        cp = ((b0 & 0x1f) << 6) | (bytes[i++] & 0x3f);
      } else if (b0 >> 4 === 0xe) {
        cp = ((b0 & 0x0f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f);
      } else if (b0 >> 3 === 0x1e) {
        cp =
          ((b0 & 0x07) << 18) |
          ((bytes[i++] & 0x3f) << 12) |
          ((bytes[i++] & 0x3f) << 6) |
          (bytes[i++] & 0x3f);
      }
    }
    out += String.fromCodePoint(cp);
  }
  return out;
}

export function toHex(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 1) out += bytes[i].toString(16).padStart(2, '0');
  return out;
}

const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** base64url بلا حشو — نفس ترميز Buffer.toString('base64url') */
export function toBase64Url(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    out += B64_CHARS[b0 >> 2];
    out += B64_CHARS[((b0 & 0x03) << 4) | ((b1 || 0) >> 4)];
    out += i + 1 < bytes.length ? B64_CHARS[((b1 & 0x0f) << 2) | ((b2 || 0) >> 6)] : '';
    out += i + 2 < bytes.length ? B64_CHARS[b2 & 0x3f] : '';
  }
  return out;
}

export function fromBase64Url(str: string): Uint8Array {
  const clean = str.replace(/-/g, '+').replace(/_/g, '/').replace(/[^A-Za-z0-9+/]/g, '');
  const len = clean.length;
  const bytes: number[] = [];
  for (let i = 0; i < len; i += 4) {
    const c0 = B64_CHARS.indexOf(clean[i]);
    const c1 = B64_CHARS.indexOf(clean[i + 1]);
    const c2 = i + 2 < len ? B64_CHARS.indexOf(clean[i + 2]) : -1;
    const c3 = i + 3 < len ? B64_CHARS.indexOf(clean[i + 3]) : -1;
    bytes.push((c0 << 2) | (c1 >> 4));
    if (c2 >= 0) bytes.push(((c1 & 0x0f) << 4) | (c2 >> 2));
    if (c3 >= 0) bytes.push(((c2 & 0x03) << 6) | c3);
  }
  return new Uint8Array(bytes);
}

export { sha256 };
