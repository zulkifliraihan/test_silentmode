import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import { ClientRegistry } from './clientRegistry';
import { FileDownloadManager } from './fileDownloadManager';
import { WSMessage } from './types';
import { setupRoutes } from './api';

const PORT = process.env.PORT || 3000;
const WS_PORT = process.env.WS_PORT || 3001;

// START: Initialize core components
const registry = new ClientRegistry();
const dlManager = new FileDownloadManager(registry);
const app = express();
// END: Initialize core components

// START: Setup Express middleware and routes
app.use(express.json());
setupRoutes(app, registry, dlManager);
// END: Setup Express middleware and routes

// START: Create HTTP and WebSocket servers
const server = http.createServer(app);
const wss = new WebSocketServer({ port: Number(WS_PORT) });
// END: Create HTTP and WebSocket servers

// START: Server startup logs
console.log(`Starting server...`);
console.log(`HTTP API: http://localhost:${PORT}`);
console.log(`WebSocket: ws://localhost:${WS_PORT}`);
// END: Server startup logs

// START: WebSocket connection handler
wss.on('connection', (ws: WebSocket) => {
  let clientId: string | null = null;

  // START: Handle incoming messages
  ws.on('message', (data: Buffer) => {
    try {
      const msg: WSMessage = JSON.parse(data.toString());

      // START: Client registration
      if (msg.type === 'client_info' && msg.clientId) {
        clientId = msg.clientId;
        registry.add(clientId, ws);
        ws.send(JSON.stringify({ type: 'connected', clientId }));
        return;
      }
      // END: Client registration

      // START: Handle ping/pong
      if (msg.type === 'ping' && clientId) {
        registry.updatePing(clientId);
        ws.send(JSON.stringify({ type: 'pong' }));
        return;
      }
      // END: Handle ping/pong

      // START: Handle download messages
      if (msg.type === 'download_chunk') {
        dlManager.handleChunk(msg);
      } else if (msg.type === 'download_complete') {
        dlManager.handleComplete(msg);
      } else if (msg.type === 'download_error') {
        dlManager.handleError(msg);
      }
      // END: Handle download messages

    } catch (err) {
      console.error('WS message error:', err);
    }
  });
  // END: Handle incoming messages

  // START: Handle connection close
  ws.on('close', () => {
    if (clientId) registry.remove(clientId);
  });
  // END: Handle connection close

  // START: Handle connection errors
  ws.on('error', (err) => {
    console.error('WS error:', err);
    if (clientId) registry.remove(clientId);
  });
  // END: Handle connection errors
});
// END: WebSocket connection handler

// START: Start HTTP server
server.listen(PORT, () => {
  console.log(`Server ready on port ${PORT}`);
});
// END: Start HTTP server

// START: Graceful shutdown handler
process.on('SIGTERM', () => {
  console.log('Shutting down...');
  server.close();
  wss.close();
});
// END: Graceful shutdown handler

// START: Export modules for testing
export { registry, dlManager };
// END: Export modules for testing
