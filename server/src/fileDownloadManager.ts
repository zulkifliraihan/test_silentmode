import * as fs from 'fs';
import * as path from 'path';
import { DownloadRequest, WSMessage } from './types';
import { ClientRegistry } from './clientRegistry';
import { v4 as uuidv4 } from 'uuid';

export class FileDownloadManager {
  private downloads = new Map<string, DownloadRequest>();
  private streams = new Map<string, fs.WriteStream>();
  private downloadDir: string;

  constructor(private registry: ClientRegistry, downloadDir = './downloads') {
    this.downloadDir = path.resolve(downloadDir);

    // START: Ensure download directory exists
    if (!fs.existsSync(this.downloadDir)) {
      fs.mkdirSync(this.downloadDir, { recursive: true });
    }
    // END: Ensure download directory exists
  }

  async request(clientId: string, fileName: string) {
    const client = this.registry.get(clientId);
    if (!client) throw new Error(`Client ${clientId} not connected`);

    const requestId = uuidv4();
    const req: DownloadRequest = {
      requestId,
      clientId,
      fileName,
      status: 'pending',
      bytesReceived: 0,
    };

    this.downloads.set(requestId, req);

    // START: Send download request to client
    const msg: WSMessage = { type: 'download_request', requestId, fileName };
    client.ws.send(JSON.stringify(msg));
    console.log(`Download request ${requestId} sent to ${clientId}`);
    // END: Send download request to client

    req.status = 'downloading';
    req.startedAt = new Date();

    return requestId;
  }

  handleChunk(msg: WSMessage) {
    const { requestId, chunk, chunkIndex, totalChunks } = msg;

    if (!requestId || !chunk) {
      console.error('Invalid chunk message');
      return;
    }

    const dl = this.downloads.get(requestId);
    if (!dl) {
      console.error(`Download ${requestId} not found`);
      return;
    }

    // START: Create write stream on first chunk
    if (!this.streams.has(requestId)) {
      try {
        if (!fs.existsSync(this.downloadDir)) {
          fs.mkdirSync(this.downloadDir, { recursive: true });
        }

        const filePath = path.join(this.downloadDir, `${dl.clientId}_${dl.fileName}`);
        const stream = fs.createWriteStream(filePath);

        stream.on('error', (err) => {
          console.error(`Write error for ${requestId}:`, err);
          dl.status = 'failed';
          dl.error = err.message;
          this.streams.delete(requestId);
        });

        this.streams.set(requestId, stream);
        dl.filePath = filePath;
      } catch (err) {
        console.error('Error creating write stream:', err);
        dl.status = 'failed';
        dl.error = err instanceof Error ? err.message : 'Unknown error';
        return;
      }
    }
    // END: Create write stream on first chunk

    const stream = this.streams.get(requestId);
    if (!stream) return;

    try {
      const buf = Buffer.from(chunk, 'base64');
      stream.write(buf);
      dl.bytesReceived = (dl.bytesReceived || 0) + buf.length;
    } catch (err) {
      console.error('Error writing chunk:', err);
      dl.status = 'failed';
      dl.error = err instanceof Error ? err.message : 'Unknown error';
      return;
    }

    // START: Log progress every 100 chunks
    if (chunkIndex !== undefined && totalChunks !== undefined) {
      if ((chunkIndex + 1) % 100 === 0 || chunkIndex + 1 === totalChunks) {
        console.log(`Chunk ${chunkIndex + 1}/${totalChunks} for ${requestId}`);
      }
    }
    // END: Log progress every 100 chunks
  }

  handleComplete(msg: WSMessage) {
    const { requestId } = msg;
    if (!requestId) return;

    const dl = this.downloads.get(requestId);
    if (!dl) {
      console.error(`Download ${requestId} not found`);
      return;
    }

    // START: Close write stream
    const stream = this.streams.get(requestId);
    if (stream) {
      stream.end();
      this.streams.delete(requestId);
    }
    // END: Close write stream

    dl.status = 'completed';
    dl.completedAt = new Date();

    console.log(`Download ${requestId} completed: ${dl.filePath}`);
    console.log(`Total bytes: ${dl.bytesReceived}`);
  }

  handleError(msg: WSMessage) {
    const { requestId, error } = msg;
    if (!requestId) return;

    const dl = this.downloads.get(requestId);
    if (!dl) return;

    const stream = this.streams.get(requestId);
    if (stream) {
      stream.end();
      this.streams.delete(requestId);
    }

    dl.status = 'failed';
    dl.error = error || 'Unknown error';
    dl.completedAt = new Date();

    console.error(`Download ${requestId} failed: ${dl.error}`);
  }

  getStatus(requestId: string) {
    return this.downloads.get(requestId);
  }

  getAll() {
    return Array.from(this.downloads.values());
  }
}
