#!/usr/bin/env node
import { createCommerceMcpApp } from '../server.js';

const app = createCommerceMcpApp();
const server = app.listen();

server.on('listening', () => {
  process.stderr.write(
    `[commerce-mcp-app] listening on http://${app.env.host}:${app.env.port}/mcp authRequired=${app.env.authRequired ? '1' : '0'}\n`,
  );
});

server.on('error', (err) => {
  process.stderr.write(
    `[commerce-mcp-app] fatal: ${err instanceof Error ? err.message : String(err)}\n`,
  );
  process.exit(1);
});
