import { ServerWebSocket } from 'bun';
import handlePing from './handlers/ping';
import handleSignin from './handlers/signin';
import handleSignup from './handlers/signup';
import handlePullItem from './handlers/pull-item';
import handleListInventory from './handlers/list-inventory';
import handleDiscardItem from './handlers/discard-item';
import handleMoveItem from './handlers/move-item';
import handleUseSkill from './handlers/use-skill';
import handleSellItem from './handlers/sell-item';
import handleFetchPersona from './handlers/fetch-persona';
import handlePeekDiscarded from './handlers/peek-discarded';
import handleBuyDiscarded from './handlers/buy-discarded';
import { WebSocketMessage, ConnectionState } from './types';

type MessageHandler = (state: ConnectionState, message: WebSocketMessage, ws: ServerWebSocket<any>) => Promise<{ type: string; body?: any }>;

const handlerRegistry: { [key: string]: MessageHandler } = {
  'ping': handlePing,
  'signup': handleSignup,
  'signin': handleSignin,
  'pull-item': handlePullItem,
  'list-inventory': handleListInventory,
  'discard-item': handleDiscardItem,
  'move-item': handleMoveItem,
  'use-skill': handleUseSkill,
  'sell-item': handleSellItem,
  'fetch-persona': handleFetchPersona,
  'peek-discarded': handlePeekDiscarded,
  'buy-discarded': handleBuyDiscarded,
};

export default handlerRegistry;
