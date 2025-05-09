import { ConnectionState } from '../types';

interface PingResponse {
  type: string;
}

export default async function handlePing(_state: ConnectionState): Promise<PingResponse> {
  return {
    type: "pong"
  };
}
