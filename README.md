# Cloud-Hosted Server with On-Premise Client File Transfer System

A robust solution for downloading files from on-premise clients (behind NAT/private networks) to a cloud-hosted server using reverse WebSocket connections.

## Architecture Overview

### Problem Statement
- **Cloud Server**: Publicly accessible
- **On-Premise Clients**: Behind private networks (e.g., restaurants), not directly accessible from the internet
- **Goal**: Server needs to download files (e.g., ~100MB) from clients on demand

### Solution: Reverse Connection Pattern
Since clients are not directly accessible, they initiate persistent WebSocket connections to the server. The server then sends download requests through these connections.

```
┌─────────────────┐         WebSocket           ┌─────────────────┐
│                 │◄─────── Connection ─────────│                 │
│  Cloud Server   │                             │ On-Premise      │
│  (Public)       │                             │ Client          │
│                 │──── Download Request ──────►│ (Private Net)   │
│                 │◄──── File Chunks ───────────│                 │
└─────────────────┘                             └─────────────────┘
```

## Features

- WebSocket-based reverse connections
- Efficient file streaming (chunks of 64KB)
- Client registry with heartbeat monitoring
- RESTful API for triggering downloads
- CLI tool for easy management
- Support for multiple concurrent clients
- Automatic reconnection on disconnect
- Progress tracking and status monitoring

## Project Structure

```
.
├── server/                 # Cloud-hosted server
│   ├── src/
│   │   ├── server.ts      # Main server (Express + WebSocket)
│   │   ├── api.ts         # REST API endpoints
│   │   ├── cli.ts         # CLI tool
│   │   ├── clientRegistry.ts      # Client connection manager
│   │   ├── fileDownloadManager.ts # File transfer handler
│   │   └── types.ts       # TypeScript interfaces
│   └── downloads/         # Downloaded files directory
│
├── client/                # On-premise client
│   └── src/
│       └── client.ts     # Client application
│
└── generate-test-file.sh # Script to create 100MB test file
```

## Setup Instructions

### 1. Generate Test File

First, generate the 100MB test file that the client will upload:

```bash
./generate-test-file.sh
```

This creates `$HOME/file_to_download.txt` (100MB).

### 2. Start the Server

```bash
cd server
npm install
npm run dev
```

The server will start:
- HTTP API on port `3000`
- WebSocket server on port `3001`

### 3. Start Client(s)

In a new terminal:

```bash
cd client
npm install
npm run dev
```

You can start multiple clients with different IDs:

```bash
# Client 1
CLIENT_ID=restaurant_1 npm run dev

# Client 2 (in another terminal)
CLIENT_ID=restaurant_2 npm run dev
```

## Usage

### Method 1: Using the CLI Tool

#### List connected clients:
```bash
cd server
npm run cli -- list-clients
```

#### Download file from a client:
```bash
npm run cli -- download --client restaurant_1
```

#### Check download status:
```bash
npm run cli -- status <request-id>
```

#### List all downloads:
```bash
npm run cli -- list-downloads
```

### Method 2: Using the REST API

#### List connected clients:
```bash
curl http://localhost:3000/clients
```

#### Trigger download:
```bash
curl -X POST http://localhost:3000/download \
  -H "Content-Type: application/json" \
  -d '{"clientId": "restaurant_1", "fileName": "file_to_download.txt"}'
```

Response:
```json
{
  "message": "Download request initiated",
  "requestId": "abc-123-def-456",
  "clientId": "restaurant_1",
  "fileName": "file_to_download.txt"
}
```

#### Check download status:
```bash
curl http://localhost:3000/download/<request-id>
```

#### List all downloads:
```bash
curl http://localhost:3000/downloads
```

## API Reference

### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-10-31T00:00:00.000Z"
}
```

### GET /clients
List all connected clients.

**Response:**
```json
{
  "clients": [
    {
      "id": "restaurant_1",
      "connectedAt": "2025-10-31T00:00:00.000Z",
      "lastHeartbeat": "2025-10-31T00:01:00.000Z"
    }
  ],
  "count": 1
}
```

### POST /download
Trigger file download from a client.

**Request Body:**
```json
{
  "clientId": "restaurant_1",
  "fileName": "file_to_download.txt"
}
```

**Response:**
```json
{
  "message": "Download request initiated",
  "requestId": "abc-123",
  "clientId": "restaurant_1",
  "fileName": "file_to_download.txt"
}
```

### GET /download/:requestId
Get download status.

**Response:**
```json
{
  "requestId": "abc-123",
  "clientId": "restaurant_1",
  "fileName": "file_to_download.txt",
  "status": "completed",
  "bytesReceived": 104857600,
  "filePath": "/path/to/downloads/restaurant_1_file_to_download.txt",
  "startedAt": "2025-10-31T00:00:00.000Z",
  "completedAt": "2025-10-31T00:00:10.000Z"
}
```

### GET /downloads
List all download requests.

**Response:**
```json
{
  "downloads": [...],
  "count": 10
}
```

## Configuration

### Server Environment Variables
```bash
PORT=3000           # HTTP API port
WS_PORT=3001        # WebSocket port
```

### Client Environment Variables
```bash
CLIENT_ID=restaurant_1              # Unique client identifier
SERVER_URL=ws://localhost:3001      # WebSocket server URL
```

## How It Works

### 1. Connection Phase
1. Client starts and connects to server via WebSocket
2. Client sends `client_info` message with unique ID
3. Server registers client in ClientRegistry
4. Heartbeat mechanism keeps connection alive

### 2. Download Phase
1. User triggers download via API or CLI
2. Server sends `download_request` to specific client
3. Client reads file and streams in 64KB chunks
4. Each chunk is base64-encoded and sent via WebSocket
5. Server receives chunks and writes to disk
6. Client sends `download_complete` when finished

### 3. File Streaming
- **Chunk Size**: 64KB (configurable)
- **Encoding**: Base64 for binary safety over JSON/WebSocket
- **Memory Efficient**: Uses Node.js streams, doesn't load entire file into memory
- **Progress Tracking**: Logs progress every 100 chunks

## Error Handling

- **Client Disconnected**: Returns error with list of available clients
- **File Not Found**: Client sends error message to server
- **Connection Lost**: Client auto-reconnects after 5 seconds
- **Heartbeat Timeout**: Server tracks last heartbeat for each client

## Performance Considerations

- **100MB File Transfer**: ~10-30 seconds depending on network
- **Concurrent Downloads**: Supports multiple simultaneous transfers
- **Memory Usage**: Minimal due to streaming approach
- **Chunk Size**: Optimized at 64KB for balance between overhead and throughput

## Building for Production

### Server
```bash
cd server
npm run build
npm start
```

### Client
```bash
cd client
npm run build
npm start
```

## Testing Scenario

1. Generate test file: `./generate-test-file.sh`
2. Start server: `cd server && npm run dev`
3. Start client: `cd client && CLIENT_ID=test_client npm run dev`
4. Trigger download: `cd server && npm run cli -- download --client test_client`
5. Check status: `npm run cli -- status <request-id>`
6. Verify file: `ls -lh server/downloads/`

## Technology Stack

- **TypeScript**: Type-safe development
- **Express.js**: HTTP API server
- **ws**: WebSocket library
- **Commander**: CLI framework
- **Axios**: HTTP client for CLI
- **Node.js Streams**: Efficient file handling

## Security Considerations

For production deployment:
- Add authentication/authorization (JWT tokens)
- Use WSS (WebSocket Secure) with TLS/SSL
- Implement rate limiting
- Add file validation and sanitization
- Use environment-based configuration
- Add request signing/verification
- Implement proper logging and monitoring

## Troubleshooting

### Client won't connect
- Check SERVER_URL environment variable
- Ensure server is running on correct port
- Check firewall rules

### Download fails
- Verify file exists at `$HOME/file_to_download.txt`
- Check file permissions
- Verify client is connected: `npm run cli -- list-clients`

### File corrupted
- Check network stability
- Verify base64 encoding/decoding
- Check disk space on server

## License

ISC
