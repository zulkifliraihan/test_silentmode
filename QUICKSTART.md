# Quick Start Guide

Get up and running in 5 minutes!

## Prerequisites

- Node.js 18+ installed
- Terminal access

## Step 1: Generate Test File (30 seconds)

```bash
./generate-test-file.sh
```

This creates a 100MB test file at `~/file_to_download.txt`.

## Step 2: Start Server (1 minute)

Open a terminal and run:

```bash
cd server
npm install
npm run dev
```

You should see:
```
[Server] HTTP API server is running on port 3000
[Server] WebSocket server is running on port 3001
[Server] Ready to accept client connections
```

## Step 3: Start Client (1 minute)

Open a NEW terminal and run:

```bash
cd client
npm install
CLIENT_ID=restaurant_1 npm run dev
```

You should see:
```
[Client] Connected to server
[Client] Registered with server as client: restaurant_1
```

## Step 4: Trigger Download (30 seconds)

Open a THIRD terminal and run:

```bash
cd server
npm run cli -- list-clients
```

You should see `restaurant_1` in the list.

Now trigger the download:

```bash
npm run cli -- download --client restaurant_1
```

You'll get a request ID. Check the status:

```bash
npm run cli -- status <request-id>
```

## Step 5: Verify Downloaded File

Check the downloads directory:

```bash
ls -lh server/downloads/
```

You should see `restaurant_1_file_to_download.txt` (100MB).

## Testing with Multiple Clients

Start additional clients in new terminals:

```bash
# Terminal 4
cd client
CLIENT_ID=restaurant_2 npm run dev

# Terminal 5
cd client
CLIENT_ID=restaurant_3 npm run dev
```

Then download from any client:

```bash
cd server
npm run cli -- download --client restaurant_2
```

## Using the API Instead of CLI

Trigger download with curl:

```bash
curl -X POST http://localhost:3000/download \
  -H "Content-Type: application/json" \
  -d '{"clientId": "restaurant_1"}'
```

Check status:

```bash
curl http://localhost:3000/download/<request-id>
```

## Common Commands

### Server CLI
```bash
npm run cli -- list-clients          # Show connected clients
npm run cli -- download -c <id>      # Download from client
npm run cli -- status <request-id>   # Check download status
npm run cli -- list-downloads        # Show all downloads
```

### API Endpoints
```bash
GET  /clients                     # List connected clients
POST /download                    # Trigger download
GET  /download/:requestId         # Get download status
GET  /downloads                   # List all downloads
```

## Troubleshooting

**Client won't connect?**
- Make sure server is running first
- Check ports 3000 and 3001 are available

**Download fails?**
- Verify test file exists: `ls -lh ~/file_to_download.txt`
- Check client is connected: `npm run cli -- list-clients`

**Need help?**
- See full README.md for detailed documentation
- Check server and client terminal logs for errors
