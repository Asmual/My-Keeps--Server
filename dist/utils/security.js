"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashNotePassword = hashNotePassword;
exports.verifyNotePassword = verifyNotePassword;
const crypto_1 = __importDefault(require("crypto"));
const SALT = process.env.NOTE_LOCK_SALT || 'my-keeps-note-lock-secret-salt-2026';
/**
 * Hashes a note password using HMAC SHA-256.
 */
function hashNotePassword(password) {
    return crypto_1.default.createHmac('sha256', SALT).update(password).digest('hex');
}
/**
 * Verifies a plain text password against a stored hash.
 */
function verifyNotePassword(password, hash) {
    return hashNotePassword(password) === hash;
}
