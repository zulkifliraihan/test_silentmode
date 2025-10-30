import { WebSocket } from 'ws';
import { ConnectedClient } from './types';

export class ClientRegistry {
  private clients = new Map<string, ConnectedClient>();

  add(id: string, ws: WebSocket) {
    // START: Register new client connection
    const client: ConnectedClient = {
      id,
      ws,
      connectedAt: new Date(),
      lastPing: new Date(),
    };
    this.clients.set(id, client);
    console.log(`Client ${id} connected (total: ${this.clients.size})`);
    // END: Register new client connection
  }

  remove(id: string) {
    if (this.clients.delete(id)) {
      console.log(`Client ${id} disconnected (total: ${this.clients.size})`);
    }
  }

  get(id: string) {
    return this.clients.get(id);
  }

  getAll() {
    return Array.from(this.clients.values());
  }

  getIds() {
    return Array.from(this.clients.keys());
  }

  // START: Update last ping timestamp
  updatePing(id: string) {
    const client = this.clients.get(id);
    if (client) client.lastPing = new Date();
  }
  // END: Update last ping timestamp

  has(id: string) {
    return this.clients.has(id);
  }
}
