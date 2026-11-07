import { prisma } from '../config/database.js';
import { verifyPassword } from '../utils/password.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * Authenticates a user by username/password.
 * Returns the user record on success.
 * Throws a generic AppError on any failure — never reveals whether
 * the username exists or the password was wrong (prevents user enumeration).
 */
export async function authenticateUser(username, plainPassword) {
  const genericError = () => new AppError('اسم المستخدم أو كلمة المرور غير صحيحة.', 401, 'INVALID_CREDENTIALS');

  const user = await prisma.user.findUnique({ where: { username } });

  if (!user) {
    // Still run a bcrypt compare against a dummy hash to keep response
    // timing consistent and avoid leaking "user does not exist" via timing.
    await verifyPassword(plainPassword, '$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvali');
    throw genericError();
  }

  if (!user.isActive) {
    throw new AppError('هذا الحساب غير مفعّل. تواصل مع مسؤول النظام.', 403, 'ACCOUNT_INACTIVE');
  }

  const isPasswordValid = await verifyPassword(plainPassword, user.passwordHash);
  if (!isPasswordValid) {
    throw genericError();
  }

  return user;
}

export async function getUserById(userId) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, fullName: true, username: true, role: true, isActive: true },
  });
}
