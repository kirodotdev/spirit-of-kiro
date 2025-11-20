/**
 * Password validation result interface
 */
export interface PasswordValidation {
  isValid: boolean;
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  errors: string[];
}

/**
 * Validates email format
 * @param email - The email address to validate
 * @returns true if email format is valid, false otherwise
 */
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }

  // RFC 5322 compliant email regex (simplified version)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  return emailRegex.test(email.trim());
}

/**
 * Validates password against requirements
 * Requirements:
 * - At least 8 characters
 * - Contains uppercase letter
 * - Contains lowercase letter
 * - Contains number
 * 
 * @param password - The password to validate
 * @returns PasswordValidation object with detailed validation results
 */
export function validatePassword(password: string): PasswordValidation {
  const result: PasswordValidation = {
    isValid: false,
    hasMinLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    errors: []
  };

  if (!password || typeof password !== 'string') {
    result.errors.push('Password is required');
    return result;
  }

  // Check minimum length (8 characters)
  result.hasMinLength = password.length >= 8;
  if (!result.hasMinLength) {
    result.errors.push('Password must be at least 8 characters');
  }

  // Check for uppercase letter
  result.hasUppercase = /[A-Z]/.test(password);
  if (!result.hasUppercase) {
    result.errors.push('Password must contain at least one uppercase letter');
  }

  // Check for lowercase letter
  result.hasLowercase = /[a-z]/.test(password);
  if (!result.hasLowercase) {
    result.errors.push('Password must contain at least one lowercase letter');
  }

  // Check for number
  result.hasNumber = /[0-9]/.test(password);
  if (!result.hasNumber) {
    result.errors.push('Password must contain at least one number');
  }

  // Password is valid if all requirements are met
  result.isValid = 
    result.hasMinLength && 
    result.hasUppercase && 
    result.hasLowercase && 
    result.hasNumber;

  return result;
}

/**
 * Validates verification/reset code format
 * Code must be exactly 6 numeric digits
 * 
 * @param code - The code to validate
 * @returns true if code is valid 6-digit numeric string, false otherwise
 */
export function validateCode(code: string): boolean {
  if (!code || typeof code !== 'string') {
    return false;
  }

  // Must be exactly 6 digits
  const codeRegex = /^\d{6}$/;
  
  return codeRegex.test(code.trim());
}
