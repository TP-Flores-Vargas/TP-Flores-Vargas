import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';

export function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  const derivedKey = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derivedKey}`;
}

export function verifyPassword(password, hashedValue) {
  if (!hashedValue) return false;
  const [salt, storedKey] = hashedValue.split(':');
  if (!salt || !storedKey) return false;
  const derivedKey = scryptSync(password, salt, 64);
  const storedBuffer = Buffer.from(storedKey, 'hex');
  if (storedBuffer.length !== derivedKey.length) return false;
  return timingSafeEqual(storedBuffer, derivedKey);
}

export function createToken() {
  return randomBytes(48).toString('hex');
}

export function createSessionId() {
  return randomUUID();
}
