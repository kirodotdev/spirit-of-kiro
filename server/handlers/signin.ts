import { SigninMessage, ConnectionState } from '../types';
import { COGNITO_CONFIG } from '../config';
import { InitiateAuthCommand, GetUserCommand, CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';

const cognitoClient = new CognitoIdentityProviderClient({
  region: COGNITO_CONFIG.region
});

interface SigninResponse {
  type: string;
  body?: any;
}

export default async function handleSignin(state: ConnectionState, data: SigninMessage): Promise<SigninResponse> {
  try {
    const { username, password } = data.body;

    if (!username) {
      return {
        type: "signin_failure",
        body: "`username` is required"
      };
    }

    if (!password) {
      return {
        type: "signin_failure",
        body: "`password` is required"
      };
    }

    // Authenticate with Cognito
    const authCommand = new InitiateAuthCommand({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: COGNITO_CONFIG.clientId,
      AuthParameters: {
        USERNAME: username,
        PASSWORD: password
      }
    });

    const authResult = await cognitoClient.send(authCommand);

    // Get user details
    const userCommand = new GetUserCommand({
      AccessToken: authResult.AuthenticationResult?.AccessToken
    });

    const userResult = await cognitoClient.send(userCommand);

    // Get the user's sub (unique ID) from the attributes
    const subAttribute = userResult.UserAttributes?.find(attr => attr.Name === 'sub');
    if (!subAttribute?.Value) {
      throw new Error('Could not get user ID');
    }

    state.userId = subAttribute.Value;
    state.username = username;

    return {
      type: "signin_success",
      body: { 
        username, 
        userId: subAttribute.Value
      }
    };
  } catch (error: any) {
    console.error('Signin error:', error);
    
    // Map Cognito errors to user-friendly messages
    let errorMessage = error.message;
    
    if (error.name === 'UserNotConfirmedException' || errorMessage.includes('UserNotConfirmedException')) {
      errorMessage = 'Please verify your email before signing in. Check your inbox for the verification code.';
    } else if (error.name === 'NotAuthorizedException' || errorMessage.includes('NotAuthorizedException')) {
      errorMessage = 'Incorrect email or password. Please try again.';
    } else if (error.name === 'UserNotFoundException' || errorMessage.includes('UserNotFoundException')) {
      errorMessage = 'No account found with this email address.';
    } else if (error.name === 'TooManyRequestsException' || errorMessage.includes('TooManyRequestsException')) {
      errorMessage = 'Too many sign-in attempts. Please try again later.';
    } else if (error.name === 'InvalidParameterException' || errorMessage.includes('InvalidParameterException')) {
      errorMessage = 'Invalid email or password format.';
    }
    
    return {
      type: "signin_failure",
      body: errorMessage
    };
  }
}
