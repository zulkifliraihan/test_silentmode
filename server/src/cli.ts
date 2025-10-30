#!/usr/bin/env node

import { Command } from 'commander';
import axios from 'axios';

const program = new Command();
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

program
  .name('server-cli')
  .description('File download server CLI')
  .version('1.0.0');

// START: List clients command
program
  .command('list-clients')
  .description('Show connected clients')
  .action(async () => {
    try {
      const res = await axios.get(`${BASE_URL}/clients`);
      const { clients, count } = res.data;

      if (count === 0) {
        console.log('No clients connected');
        return;
      }

      console.log(`\nConnected clients (${count}):\n`);
      clients.forEach((c: any) => {
        console.log(`  ID: ${c.id}`);
        console.log(`  Connected: ${new Date(c.connectedAt).toLocaleString()}`);
        console.log(`  Last ping: ${new Date(c.lastPing).toLocaleString()}`);
        console.log('');
      });
    } catch (err) {
      console.error('Error:', err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });
// END: List clients command

// START: Download command
program
  .command('download')
  .description('Download file from client')
  .requiredOption('-c, --client <clientId>', 'Client ID')
  .option('-f, --file <fileName>', 'File name', 'file_to_download.txt')
  .action(async (opts) => {
    try {
      console.log(`Requesting download from: ${opts.client}`);
      console.log(`File: ${opts.file}\n`);

      const res = await axios.post(`${BASE_URL}/download`, {
        clientId: opts.client,
        fileName: opts.file,
      });

      const { requestId, message } = res.data;
      console.log(`✓ ${message}`);
      console.log(`Request ID: ${requestId}\n`);
      console.log(`Check status: server-cli status ${requestId}`);
    } catch (err: any) {
      if (err.response) {
        console.error('Error:', err.response.data.error);
        if (err.response.data.available) {
          console.log('\nAvailable:', err.response.data.available.join(', '));
        }
      } else {
        console.error('Error:', err.message);
      }
      process.exit(1);
    }
  });
// END: Download command

// START: Status command
program
  .command('status')
  .description('Check download status')
  .argument('<requestId>', 'Request ID')
  .action(async (requestId) => {
    try {
      const res = await axios.get(`${BASE_URL}/download/${requestId}`);
      const dl = res.data;

      console.log(`\nDownload Status:\n`);
      console.log(`  Request: ${dl.requestId}`);
      console.log(`  Client: ${dl.clientId}`);
      console.log(`  File: ${dl.fileName}`);
      console.log(`  Status: ${dl.status}`);
      console.log(`  Bytes: ${dl.bytesReceived?.toLocaleString() || 0}`);

      if (dl.filePath) {
        console.log(`  Path: ${dl.filePath}`);
      }

      if (dl.startedAt) {
        console.log(`  Started: ${new Date(dl.startedAt).toLocaleString()}`);
      }

      if (dl.completedAt) {
        console.log(`  Completed: ${new Date(dl.completedAt).toLocaleString()}`);
      }

      if (dl.error) {
        console.log(`  Error: ${dl.error}`);
      }

      console.log('');
    } catch (err: any) {
      if (err.response?.status === 404) {
        console.error('Error: Download not found');
      } else {
        console.error('Error:', err.message);
      }
      process.exit(1);
    }
  });
// END: Status command

// START: List downloads command
program
  .command('list-downloads')
  .description('Show all downloads')
  .action(async () => {
    try {
      const res = await axios.get(`${BASE_URL}/downloads`);
      const { downloads, count } = res.data;

      if (count === 0) {
        console.log('No downloads');
        return;
      }

      console.log(`\nDownloads (${count}):\n`);
      downloads.forEach((dl: any) => {
        console.log(`  Request: ${dl.requestId}`);
        console.log(`  Client: ${dl.clientId}`);
        console.log(`  File: ${dl.fileName}`);
        console.log(`  Status: ${dl.status}`);
        console.log(`  Bytes: ${dl.bytesReceived?.toLocaleString() || 0}`);
        if (dl.filePath) {
          console.log(`  Path: ${dl.filePath}`);
        }
        console.log('');
      });
    } catch (err) {
      console.error('Error:', err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });
// END: List downloads command

program.parse();
