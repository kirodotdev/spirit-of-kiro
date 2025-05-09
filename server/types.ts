import { ServerWebSocket } from 'bun';

export interface ConnectionState {
  ws: ServerWebSocket;
  userId?: string;
  username?: string;
}

export interface SignupMessage {
    type: 'signup';
    body: {
        username: string;
        password: string;
    };
}

export interface SigninMessage {
    type: 'signin';
    body: {
        username: string;
        password: string;
    };
}

export interface PullItemMessage {
    type: 'pull-item';
    params: {
        userId: string;
    };
}

export interface ListInventoryMessage {
    type: 'list-inventory';
    body: {
        inventoryId: string;
    };
}

export interface DiscardItemMessage {
    type: 'discard-item';
    body: {
        itemId: string;
    };
}

export interface EquipItemMessage {
    type: 'equip-item';
    body: {
        itemId: string;
        slot: string;
    };
}

export type WebSocketMessage = SignupMessage | SigninMessage | PullItemMessage | ListInventoryMessage | DiscardItemMessage | EquipItemMessage;
