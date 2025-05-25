import { type Serve } from 'bun';
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
import { formatMessage } from './utils/message';
import { WebSocketMessage, SignupMessage, SigninMessage, PullItemMessage, ListInventoryMessage, DiscardItemMessage, MoveItemMessage, UseSkillMessage, SellItemMessage, FetchPersonaMessage, PeekDiscardedMessage, BuyDiscardedMessage, ConnectionState } from './types';
import * as config from './config';

interface WebSocketData {
  state: ConnectionState;
}

/**
 * Logs all configuration values for debugging purposes
 */
function logConfigForDebugging() {  
  console.log('\n[DYNAMODB CONFIG]');
  console.log(JSON.stringify(config.DYNAMODB_CONFIG, null, 2));
  
  console.log('\n[S3 CONFIG]');
  console.log(JSON.stringify(config.S3_CONFIG, null, 2));
  
  console.log('\n[CLOUDFRONT CONFIG]');
  console.log(JSON.stringify(config.CLOUDFRONT_CONFIG, null, 2));
}

// Log all configuration values before starting the server
logConfigForDebugging();

export default {
  port: 8080,
  async fetch(req, server) {
    // Upgrade to websocket
    if (req.headers.get('Upgrade') === 'websocket') {
      if (server.upgrade(req)) {
        return;
      }
      return new Response('Upgrade failed', { status: 500 });
    }

    return new Response("404!");
  },
  websocket: {
    open(ws: ServerWebSocket<WebSocketData>) {
      const state: ConnectionState = { ws };
      ws.data = { state };
      console.log('A client connected');
    },
    async message(ws: ServerWebSocket<WebSocketData>, message: string | Buffer) {
      console.log("Server got message", message);
      if (typeof message !== 'string') {
        ws.send(formatMessage('error', 'Invalid message format'));
        return;
      }

      let data: WebSocketMessage;
      try {
        data = JSON.parse(message);
      } catch (e) {
        ws.send(formatMessage('error', 'Invalid message format'));
        return;
      }

      if (!ws.data?.state) {
        ws.send(formatMessage('error', 'No connection state'));
        return;
      }

      let result: {
        type: string;
        body?: any;
      };

      switch (data.type) {
        case 'ping':
          result = await handlePing(ws.data.state);
          ws.send(formatMessage(result.type))
          break;
        case 'signup':
          result = await handleSignup(ws.data.state, data as SignupMessage);
          ws.send(formatMessage(result.type, result.body))
          break;
        case 'signin':
          result = await handleSignin(ws.data.state, data as SigninMessage);
          ws.send(formatMessage(result.type, result.body))
          break;
        case 'pull-item':
          result = await handlePullItem(ws.data.state, data as PullItemMessage);
          ws.send(formatMessage(result.type, result.body))
          break;
        case 'list-inventory':
          result = await handleListInventory(ws.data.state, data as ListInventoryMessage);
          ws.send(formatMessage(result.type, result.body))
          break;
        case 'discard-item':
          result = await handleDiscardItem(ws.data.state, data as DiscardItemMessage);
          ws.send(formatMessage(result.type, result.body));
          break;
        case 'move-item':
          result = await handleMoveItem(ws.data.state, data as MoveItemMessage);
          ws.send(formatMessage(result.type, result.body));
          break;
        case 'use-skill':
          result = await handleUseSkill(ws.data.state, data as UseSkillMessage, ws);
          ws.send(formatMessage(result.type, result.body));
          break;
        case 'sell-item':
          result = await handleSellItem(ws.data.state, data as SellItemMessage);
          ws.send(formatMessage(result.type, result.body));
          break;
        case 'fetch-persona':
          result = await handleFetchPersona(ws.data.state, data as FetchPersonaMessage);
          ws.send(formatMessage(result.type, result.body));
          break;
        case 'peek-discarded':
          result = await handlePeekDiscarded(ws.data.state, data as PeekDiscardedMessage);
          ws.send(formatMessage(result.type, result.body));
          break;
        case 'buy-discarded':
          result = await handleBuyDiscarded(ws.data.state, data as BuyDiscardedMessage);
          ws.send(formatMessage(result.type, result.body));
          break;
        default:
          ws.send(formatMessage('error', 'Invalid message type'));
      }
    },
    close(_ws, _code, _message) {
      console.log('Client disconnected');
    },
    drain(_ws) { }
  }
} satisfies Serve;
