import crypto from 'crypto';

const SALT = process.env.NOTE_LOCK_SALT || 'my-keeps-note-lock-secret-salt-2026';

/**
 * Hashes a note password using HMAC SHA-256.
 */
export function hashNotePassword(password: string): string {
  return crypto.createHmac('sha256', SALT).update(password).digest('hex');
}

/**
 * Verifies a plain text password against a stored hash.
 */
export function verifyNotePassword(password: string, hash: string): boolean {
  return hashNotePassword(password) === hash;
}
