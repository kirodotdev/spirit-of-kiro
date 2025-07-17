import handlerRegistry from './handlerRegistry';
import { formatMessage } from './utils/message';
import { WebSocketMessage, ConnectionState } from './types';
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

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  // Close any open connections or cleanup here if needed
  process.exit(0);
});

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

    // Return 200 for root path
    if (req.url.endsWith('/')) {
      return new Response('OK', { status: 200 });
    }

    return new Response("404!", { status: 404 });
  },
  websocket: {
    open(ws: ServerWebSocket<WebSocketData>) {
      const state: ConnectionState = { ws };
      ws.data = { state };
      console.log('A client connected');
    },
    async message(ws: ServerWebSocket<WebSocketData>, message: string | Buffer) {
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

      const handler = handlerRegistry[data.type];
      if (handler) {
        const result = await handler(ws.data.state, data, ws);
        ws.send(formatMessage(result.type, result.body));
      } else {
        ws.send(formatMessage('error', 'Invalid message type'));
      }
    },
    close(_ws, _code, _message) {
      console.log('Client disconnected');
    },
    drain(_ws) { }
  }
} satisfies Serve;
