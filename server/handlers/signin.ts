import { verifyPassword } from '../utils/password';
import { SigninMessage, ConnectionState } from '../types';
import { getUser } from '../state/user-store';

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

    const user = await getUser(username);
    if (!user || !(await verifyPassword(password, user.password))) {
      return {
        type: "signin_failure",
        body: "Invalid username or password"
      };
    }

    state.userId = user.userId;
    state.username = username;
    return {
      type: "signin_success",
      body: { username, userId: user.userId }
    };
  } catch (error) {
    return {
      type: "signin_failure",
      body: error.message
    };
  }
}
