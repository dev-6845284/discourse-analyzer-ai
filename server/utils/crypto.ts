import crypto from 'crypto';

const SECRET = process.env.API_KEYS_SECRET || '';
if (!SECRET) {
  console.warn('[API_KEYS] Warning: API_KEYS_SECRET is not set; keys will be stored without encryption.');
}

const ALGO = 'aes-256-gcm';

function getKey() {
  // Derive 32-byte key from secret
  return crypto.createHash('sha256').update(SECRET).digest();
}

export function encryptText(plain: string): string {
  if (!SECRET) return plain;
  const iv = crypto.randomBytes(12);
  const key = getKey();
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

export function decryptText(payload: string): string {
  if (!SECRET) return payload;
  const data = Buffer.from(payload, 'base64');
  const iv = data.slice(0, 12);
  const tag = data.slice(12, 28);
  const encrypted = data.slice(28);
  const key = getKey();
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const out = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return out.toString('utf8');
}

export function maybeDecrypt(value?: string | null) {
  if (!value) return value;
  try {
    return decryptText(value);
  } catch (e) {
    // If decrypt fails, return original to avoid breaking callers
    return value;
  }
}

export function maybeEncrypt(value?: string | null) {
  if (!value) return value;
  try {
    return encryptText(value);
  } catch (e) {
    return value;
  }
}

export default { encryptText, decryptText, maybeDecrypt, maybeEncrypt };
