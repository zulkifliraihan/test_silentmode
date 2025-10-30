import { Express, Request, Response } from 'express';
import { ClientRegistry } from './clientRegistry';
import { FileDownloadManager } from './fileDownloadManager';

export function setupRoutes(
  app: Express,
  registry: ClientRegistry,
  dlManager: FileDownloadManager
) {
  // START: Health check endpoint
  app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });
  // END: Health check endpoint

  // START: List connected clients
  app.get('/clients', (req: Request, res: Response) => {
    const clients = registry.getAll().map(c => ({
      id: c.id,
      connectedAt: c.connectedAt,
      lastPing: c.lastPing,
    }));
    res.json({ clients, count: clients.length });
  });
  // END: List connected clients

  // START: Trigger file download from client
  app.post('/download', async (req: Request, res: Response) => {
    try {
      const { clientId, fileName } = req.body;

      if (!clientId) {
        return res.status(400).json({ error: 'clientId required' });
      }

      const file = fileName || 'file_to_download.txt';

      if (!registry.has(clientId)) {
        return res.status(404).json({
          error: `Client ${clientId} not connected`,
          available: registry.getIds()
        });
      }

      const requestId = await dlManager.request(clientId, file);

      res.json({
        message: 'Download started',
        requestId,
        clientId,
        fileName: file,
      });
    } catch (err) {
      console.error('Download error:', err);
      res.status(500).json({
        error: 'Download failed',
        details: err instanceof Error ? err.message : 'Unknown error'
      });
    }
  });
  // END: Trigger file download from client

  // START: Get download status
  app.get('/download/:requestId', (req: Request, res: Response) => {
    const { requestId } = req.params;
    const dl = dlManager.getStatus(requestId);

    if (!dl) {
      return res.status(404).json({ error: 'Download not found' });
    }

    res.json({
      requestId: dl.requestId,
      clientId: dl.clientId,
      fileName: dl.fileName,
      status: dl.status,
      bytesReceived: dl.bytesReceived,
      filePath: dl.filePath,
      startedAt: dl.startedAt,
      completedAt: dl.completedAt,
      error: dl.error,
    });
  });
  // END: Get download status

  // START: List all downloads
  app.get('/downloads', (req: Request, res: Response) => {
    const downloads = dlManager.getAll().map(d => ({
      requestId: d.requestId,
      clientId: d.clientId,
      fileName: d.fileName,
      status: d.status,
      bytesReceived: d.bytesReceived,
      filePath: d.filePath,
      startedAt: d.startedAt,
      completedAt: d.completedAt,
      error: d.error,
    }));

    res.json({ downloads, count: downloads.length });
  });
  // END: List all downloads
}
