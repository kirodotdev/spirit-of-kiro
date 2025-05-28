import { hashPassword } from '../utils/password';
import { SignupMessage, ConnectionState } from '../types';
import { createUser } from '../state/user-store';

interface SignupResponse {
  type: string;
  body?: any;
}

export default async function handleSignup(state: ConnectionState, data: SignupMessage): Promise<SignupResponse> {
  const { username, password } = data.body;

  if (!username) {
    return {
      type: "signup_failure",
      body: "`username` is required"
    };
  }

  if (!password) {
    return {
      type: "signup_failure",
      body: "`password` is required"
    };
  }

  try {
    const hashedPassword = await hashPassword(password);
    // Generate a GUID for the item
    const id = crypto.randomUUID();

    const result = await createUser(id, username, hashedPassword);

    state.userId = result.userId;
    state.username = username;

    return {
      type: "signup_success",
      body: { username, userId: result.userId }
    };
  } catch (error) {
    return {
      type: "signup_failure",
      body: error.message
    };
  }
}
