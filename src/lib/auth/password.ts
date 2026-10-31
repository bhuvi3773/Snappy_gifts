import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

export interface PasswordValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates password complexity
 * Requirement: Minimum 8 characters, at least one letter and one number
 */
export function validatePasswordStrength(password: string): PasswordValidationResult {
  if (!password || typeof password !== 'string') {
    return { isValid: false, error: 'Password is required' };
  }
  if (password.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters long' };
  }
  if (password.length > 128) {
    return { isValid: false, error: 'Password cannot exceed 128 characters' };
  }
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  if (!hasLetter || !hasNumber) {
    return { isValid: false, error: 'Password must contain at least one letter and one number' };
  }

  return { isValid: true };
}

/**
 * Hashes a plaintext password using bcrypt with 10 salt rounds
 */
export async function hashPassword(password: string): Promise<string> {
  const validation = validatePasswordStrength(password);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verifies a plaintext password against an existing bcrypt hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) return false;
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}
