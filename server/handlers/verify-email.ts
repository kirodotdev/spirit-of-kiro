import { VerifyEmailMessage, ConnectionState } from '../types';
import { COGNITO_CONFIG } from '../config';
import { 
  ConfirmSignUpCommand,
  CognitoIdentityProviderClient 
} from '@aws-sdk/client-cognito-identity-provider';

const cognitoClient = new CognitoIdentityProviderClient({
  region: COGNITO_CONFIG.region
});

interface VerifyEmailResponse {
  type: string;
  body?: any;
}

/**
 * Maps Cognito error codes to user-friendly messages
 */
function mapCognitoError(error: any): string {
  const errorMap: Record<string, string> = {
    'CodeMismatchException': 'Invalid verification code. Please try again.',
    'ExpiredCodeException': 'Verification code has expired. Please request a new one.',
    'LimitExceededException': 'Too many attempts. Please wait before trying again.',
    'UserNotFoundException': 'No account found with this email address.',
    'NotAuthorizedException': 'Invalid verification code. Please try again.',
    'InvalidParameterException': 'Invalid input. Please check your information.',
    'TooManyRequestsException': 'Too many requests. Please try again later.',
    'TooManyFailedAttemptsException': 'Too many failed attempts. Please try again later.',
  };

  const errorName = error?.name || error?.code || 'UnknownError';
  return errorMap[errorName] || 'An error occurred. Please try again.';
}

export default async function handleVerifyEmail(
  state: ConnectionState, 
  data: VerifyEmailMessage
): Promise<VerifyEmailResponse> {
  const { email, code } = data.body;

  if (!email) {
    return {
      type: "verify_email_failure",
      body: "Email is required"
    };
  }

  if (!code) {
    return {
      type: "verify_email_failure",
      body: "Verification code is required"
    };
  }

  try {
    const command = new ConfirmSignUpCommand({
      ClientId: COGNITO_CONFIG.clientId,
      Username: email,
      ConfirmationCode: code
    });

    await cognitoClient.send(command);

    return {
      type: "verify_email_success",
      body: { email }
    };
  } catch (error: any) {
    console.error('Email verification error:', error);
    return {
      type: "verify_email_failure",
      body: mapCognitoError(error)
    };
  }
}
