import { ConnectionState } from '../types';
import { getPersonaDetails } from '../state/user-store';

interface FetchPersonaMessage {
  type: 'fetch-persona';
  body: {};
}

interface FetchPersonaResponse {
  type: string;
  body?: any;
}

export default async function handleFetchPersona(state: ConnectionState, _data: FetchPersonaMessage): Promise<FetchPersonaResponse> {
  if (!state.userId) {
    return {
      type: 'error',
      body: 'Authentication required'
    };
  }

  try {
    const details = await getPersonaDetails(state.userId);
    return {
      type: 'persona-details',
      body: details
    };
  } catch (error) {
    console.error('Error fetching persona details:', error);
    return {
      type: 'error',
      body: 'Failed to fetch persona details'
    };
  }
} 