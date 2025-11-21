import { ResendVerificationMessage, ConnectionState } from '../types';
import { COGNITO_CONFIG } from '../config';
import { 
  ResendConfirmationCodeCommand,
  CognitoIdentityProviderClient 
} from '@aws-sdk/client-cognito-identity-provider';

const cognitoClient = new CognitoIdentityProviderClient({
  region: COGNITO_CONFIG.region
});

interface ResendVerificationResponse {
  type: string;
  body?: any;
}

/**
 * Maps Cognito error codes to user-friendly messages
 */
function mapCognitoError(error: any): string {
  const errorMap: Record<string, string> = {
    'LimitExceededException': 'Too many attempts. Please wait before trying again.',
    'UserNotFoundException': 'No account found with this email address.',
    'InvalidParameterException': 'Invalid input. Please check your information.',
    'TooManyRequestsException': 'Too many requests. Please try again later.',
    'CodeDeliveryFailureException': 'Failed to send verification code. Please try again.',
  };

  const errorName = error?.name || error?.code || 'UnknownError';
  return errorMap[errorName] || 'An error occurred. Please try again.';
}

export default async function handleResendVerification(
  state: ConnectionState, 
  data: ResendVerificationMessage
): Promise<ResendVerificationResponse> {
  const { email } = data.body;

  if (!email) {
    return {
      type: "resend_verification_failure",
      body: "Email is required"
    };
  }

  try {
    const command = new ResendConfirmationCodeCommand({
      ClientId: COGNITO_CONFIG.clientId,
      Username: email
    });

    await cognitoClient.send(command);

    return {
      type: "resend_verification_success",
      body: { email }
    };
  } catch (error: any) {
    console.error('Resend verification error:', error);
    return {
      type: "resend_verification_failure",
      body: mapCognitoError(error)
    };
  }
}
