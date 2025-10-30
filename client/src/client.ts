import WebSocket from 'ws';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

interface WSMessage {
  type: string;
  requestId?: string;
  fileName?: string;
  clientId?: string;
  chunk?: string;
  chunkIndex?: number;
  totalChunks?: number;
  error?: string;
}

class Client {
  private ws: WebSocket | null = null;
  private clientId: string;
  private serverUrl: string;
  private reconnectDelay = 5000;
  private pingTimer: NodeJS.Timeout | null = null;

  constructor(clientId: string, serverUrl = 'ws://localhost:3001') {
    this.clientId = clientId;
    this.serverUrl = serverUrl;
  }

  connect() {
    console.log(`Connecting to ${this.serverUrl}`);

    this.ws = new WebSocket(this.serverUrl);

    this.ws.on('open', () => {
      console.log('Connected to server');

      // START: Send client info on connect
      const msg: WSMessage = {
        type: 'client_info',
        clientId: this.clientId,
      };
      this.ws!.send(JSON.stringify(msg));
      // END: Send client info on connect

      this.startPing();
    });

    this.ws.on('message', (data: Buffer) => {
      try {
        const msg: WSMessage = JSON.parse(data.toString());
        this.handleMessage(msg);
      } catch (err) {
        console.error('Message error:', err);
      }
    });

    this.ws.on('close', () => {
      console.log('Disconnected');
      this.stopPing();
      this.reconnect();
    });

    this.ws.on('error', (err) => {
      console.error('WS error:', err.message);
    });
  }

  private reconnect() {
    console.log(`Reconnecting in ${this.reconnectDelay / 1000}s...`);
    setTimeout(() => this.connect(), this.reconnectDelay);
  }

  // START: Ping/heartbeat mechanism
  private startPing() {
    this.pingTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        const msg: WSMessage = { type: 'ping' };
        this.ws.send(JSON.stringify(msg));
      }
    }, 30000);
  }

  private stopPing() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }
  // END: Ping/heartbeat mechanism

  private handleMessage(msg: WSMessage) {
    switch (msg.type) {
      case 'connected':
        console.log(`Registered as: ${msg.clientId}`);
        break;

      case 'pong':
        break;

      case 'download_request':
        if (msg.requestId && msg.fileName) {
          this.handleDownload(msg.requestId, msg.fileName);
        }
        break;
    }
  }

  // START: Handle file download request
  private async handleDownload(requestId: string, fileName: string) {
    console.log(`Download requested: ${fileName}`);

    try {
      const filePath = path.resolve(os.homedir(), fileName);

      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      const stats = fs.statSync(filePath);
      const fileSize = stats.size;
      const chunkSize = 64 * 1024; // 64KB
      const totalChunks = Math.ceil(fileSize / chunkSize);

      console.log(`File: ${filePath}`);
      console.log(`Size: ${fileSize.toLocaleString()} bytes`);
      console.log(`Chunks: ${totalChunks}`);

      let chunkIndex = 0;
      let bytesRead = 0;

      // START: Read and send file in chunks
      const fd = fs.openSync(filePath, 'r');

      while (bytesRead < fileSize) {
        const buf = Buffer.alloc(chunkSize);
        const toRead = Math.min(chunkSize, fileSize - bytesRead);
        const actual = fs.readSync(fd, buf, 0, toRead, bytesRead);

        if (actual === 0) break;

        const chunk = actual < chunkSize ? buf.subarray(0, actual) : buf;

        const msg: WSMessage = {
          type: 'download_chunk',
          requestId,
          chunk: chunk.toString('base64'),
          chunkIndex,
          totalChunks,
        };

        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify(msg));
        }

        bytesRead += actual;
        chunkIndex++;

        if (chunkIndex % 100 === 0) {
          console.log(`Progress: ${chunkIndex}/${totalChunks} (${bytesRead.toLocaleString()}/${fileSize.toLocaleString()} bytes)`);
        }
      }

      fs.closeSync(fd);
      // END: Read and send file in chunks

      console.log(`Transfer complete: ${chunkIndex} chunks (${bytesRead.toLocaleString()} bytes)`);

      // START: Send completion message
      const completeMsg: WSMessage = {
        type: 'download_complete',
        requestId,
      };

      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(completeMsg));
      }
      // END: Send completion message

    } catch (err) {
      console.error('Download error:', err);

      const errMsg: WSMessage = {
        type: 'download_error',
        requestId,
        error: err instanceof Error ? err.message : 'Unknown error',
      };

      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(errMsg));
      }
    }
  }
  // END: Handle file download request

  disconnect() {
    this.stopPing();
    if (this.ws) this.ws.close();
  }
}

// START: Main execution
const clientId = process.env.CLIENT_ID || `client_${Math.random().toString(36).substring(7)}`;
const serverUrl = process.env.SERVER_URL || 'ws://localhost:3001';

console.log('================================');
console.log('File Transfer Client');
console.log('================================');
console.log(`ID: ${clientId}`);
console.log(`Server: ${serverUrl}`);
console.log('================================\n');

const client = new Client(clientId, serverUrl);
client.connect();

process.on('SIGTERM', () => {
  console.log('Shutting down...');
  client.disconnect();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Shutting down...');
  client.disconnect();
  process.exit(0);
});
// END: Main execution
