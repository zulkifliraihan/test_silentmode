import { WebSocket } from 'ws';

// START: Client connection tracking
export interface ConnectedClient {
  id: string;
  ws: WebSocket;
  connectedAt: Date;
  lastPing: Date;
}
// END: Client connection tracking

// START: Download request model
export interface DownloadRequest {
  requestId: string;
  clientId: string;
  fileName: string;
  status: 'pending' | 'downloading' | 'completed' | 'failed';
  error?: string;
  filePath?: string;
  bytesReceived?: number;
  startedAt?: Date;
  completedAt?: Date;
}
// END: Download request model

// START: WebSocket message protocol
export interface WSMessage {
  type: 'download_request' | 'download_chunk' | 'download_complete' | 'download_error' | 'ping' | 'client_info';
  requestId?: string;
  fileName?: string;
  chunk?: string;
  chunkIndex?: number;
  totalChunks?: number;
  error?: string;
  clientId?: string;
}
// END: WebSocket message protocol
