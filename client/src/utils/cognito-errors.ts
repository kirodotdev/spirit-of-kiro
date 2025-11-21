/**
 * Maps AWS Cognito error codes to user-friendly error messages
 * @param error - The error object from Cognito
 * @returns A user-friendly error message
 */
export function mapCognitoError(error: any): string {
  // Handle case where error is a string
  if (typeof error === 'string') {
    return error;
  }

  // Extract error code from various possible error structures
  const errorCode = error?.code || error?.name || error?.__type || '';
  const errorMessage = error?.message || '';

  // Map Cognito error codes to user-friendly messages
  switch (errorCode) {
    case 'CodeMismatchException':
      return 'Invalid verification code. Please try again.';

    case 'ExpiredCodeException':
      return 'Verification code has expired. Please request a new one.';

    case 'LimitExceededException':
      return 'Too many attempts. Please wait before trying again.';

    case 'UserNotFoundException':
      return 'No account found with this email address.';

    case 'InvalidPasswordException':
      return 'Password must be at least 8 characters with uppercase, lowercase, and numbers.';

    case 'UserNotConfirmedException':
      return 'Please verify your email before signing in.';

    case 'NotAuthorizedException':
      return 'Incorrect email or password.';

    case 'InvalidParameterException':
      return 'Invalid input. Please check your information.';

    case 'TooManyRequestsException':
      return 'Too many requests. Please try again later.';

    case 'TooManyFailedAttemptsException':
      return 'Too many failed attempts. Please try again later.';

    // Additional common Cognito errors
    case 'UsernameExistsException':
      return 'An account with this email already exists.';

    case 'InvalidLambdaResponseException':
      return 'Server error. Please try again later.';

    case 'UserLambdaValidationException':
      return 'Validation error. Please check your information.';

    case 'ResourceNotFoundException':
      return 'Service temporarily unavailable. Please try again later.';

    case 'InternalErrorException':
      return 'An unexpected error occurred. Please try again.';

    default:
      // Return the original error message if available, otherwise a generic message
      return errorMessage || 'An unexpected error occurred. Please try again.';
  }
}
