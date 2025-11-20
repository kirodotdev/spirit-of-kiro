import { ConfirmForgotPasswordMessage, ConnectionState } from '../types';
import { COGNITO_CONFIG } from '../config';
import { 
  ConfirmForgotPasswordCommand,
  CognitoIdentityProviderClient 
} from '@aws-sdk/client-cognito-identity-provider';

const cognitoClient = new CognitoIdentityProviderClient({
  region: COGNITO_CONFIG.region
});

interface ConfirmForgotPasswordResponse {
  type: string;
  body?: any;
}

/**
 * Maps Cognito error codes to user-friendly messages
 */
function mapCognitoError(error: any): string {
  const errorMap: Record<string, string> = {
    'CodeMismatchException': 'Invalid reset code. Please try again.',
    'ExpiredCodeException': 'Reset code has expired. Please request a new one.',
    'LimitExceededException': 'Too many attempts. Please wait before trying again.',
    'UserNotFoundException': 'No account found with this email address.',
    'InvalidPasswordException': 'Password must be at least 8 characters with uppercase, lowercase, and numbers.',
    'InvalidParameterException': 'Invalid input. Please check your information.',
    'TooManyRequestsException': 'Too many requests. Please try again later.',
    'TooManyFailedAttemptsException': 'Too many failed attempts. Please try again later.',
  };

  const errorName = error?.name || error?.code || 'UnknownError';
  return errorMap[errorName] || 'An error occurred. Please try again.';
}

/**
 * Validates password requirements server-side
 */
function validatePassword(password: string): { valid: boolean; message?: string } {
  if (!password || password.length < 8) {
    return {
      valid: false,
      message: 'Password must be at least 8 characters long.'
    };
  }

  if (!/[A-Z]/.test(password)) {
    return {
      valid: false,
      message: 'Password must contain at least one uppercase letter.'
    };
  }

  if (!/[a-z]/.test(password)) {
    return {
      valid: false,
      message: 'Password must contain at least one lowercase letter.'
    };
  }

  if (!/[0-9]/.test(password)) {
    return {
      valid: false,
      message: 'Password must contain at least one number.'
    };
  }

  return { valid: true };
}

export default async function handleConfirmForgotPassword(
  state: ConnectionState, 
  data: ConfirmForgotPasswordMessage
): Promise<ConfirmForgotPasswordResponse> {
  const { email, code, newPassword } = data.body;

  if (!email) {
    return {
      type: "confirm_forgot_password_failure",
      body: "Email is required"
    };
  }

  if (!code) {
    return {
      type: "confirm_forgot_password_failure",
      body: "Reset code is required"
    };
  }

  if (!newPassword) {
    return {
      type: "confirm_forgot_password_failure",
      body: "New password is required"
    };
  }

  // Validate password requirements
  const passwordValidation = validatePassword(newPassword);
  if (!passwordValidation.valid) {
    return {
      type: "confirm_forgot_password_failure",
      body: passwordValidation.message
    };
  }

  try {
    const command = new ConfirmForgotPasswordCommand({
      ClientId: COGNITO_CONFIG.clientId,
      Username: email,
      ConfirmationCode: code,
      Password: newPassword
    });

    await cognitoClient.send(command);

    return {
      type: "confirm_forgot_password_success",
      body: { email }
    };
  } catch (error: any) {
    console.error('Confirm forgot password error:', error);
    return {
      type: "confirm_forgot_password_failure",
      body: mapCognitoError(error)
    };
  }
}
