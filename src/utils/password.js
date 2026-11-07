import bcrypt from 'bcrypt';
import { env } from '../config/env.js';

export async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, env.security.bcryptSaltRounds);
}

export async function verifyPassword(plainPassword, passwordHash) {
  return bcrypt.compare(plainPassword, passwordHash);
}
