import { ForgotPasswordMessage, ConnectionState } from '../types';
import { COGNITO_CONFIG } from '../config';
import { 
  ForgotPasswordCommand,
  CognitoIdentityProviderClient 
} from '@aws-sdk/client-cognito-identity-provider';

const cognitoClient = new CognitoIdentityProviderClient({
  region: COGNITO_CONFIG.region
});

interface ForgotPasswordResponse {
  type: string;
  body?: any;
}

/**
 * Maps Cognito error codes to user-friendly messages
 */
function mapCognitoError(error: any): string {
  const errorMap: Record<string, string> = {
    'LimitExceededException': 'Too many attempts. Please wait before trying again.',
    'InvalidParameterException': 'Invalid input. Please check your information.',
    'TooManyRequestsException': 'Too many requests. Please try again later.',
    'CodeDeliveryFailureException': 'Failed to send reset code. Please try again.',
    'UserNotFoundException': 'If an account exists with this email, a reset code has been sent.',
  };

  const errorName = error?.name || error?.code || 'UnknownError';
  return errorMap[errorName] || 'An error occurred. Please try again.';
}

export default async function handleForgotPassword(
  state: ConnectionState, 
  data: ForgotPasswordMessage
): Promise<ForgotPasswordResponse> {
  const { email } = data.body;

  if (!email) {
    return {
      type: "forgot_password_failure",
      body: "Email is required"
    };
  }

  try {
    const command = new ForgotPasswordCommand({
      ClientId: COGNITO_CONFIG.clientId,
      Username: email
    });

    await cognitoClient.send(command);

    // Always return success to prevent email enumeration
    return {
      type: "forgot_password_success",
      body: { 
        email,
        message: "If an account exists with this email, a reset code has been sent."
      }
    };
  } catch (error: any) {
    console.error('Forgot password error:', error);
    
    // For UserNotFoundException, still return success to prevent enumeration
    if (error?.name === 'UserNotFoundException') {
      return {
        type: "forgot_password_success",
        body: { 
          email,
          message: "If an account exists with this email, a reset code has been sent."
        }
      };
    }

    return {
      type: "forgot_password_failure",
      body: mapCognitoError(error)
    };
  }
}
