/**
 * Spawns the trendyol-mcp stdio binary and exercises it over real JSON-RPC.
 * Verifies: initialize handshake, tools/list count, a few tools/call results,
 * AND that nothing leaks to stdout outside JSON-RPC (which would corrupt MCP).
 */
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

interface RpcRequest {
  jsonrpc: '2.0';
  id?: number;
  method: string;
  params?: unknown;
}

interface RpcResponse {
  jsonrpc: '2.0';
  id?: number;
  result?: unknown;
  error?: { code: number; message: string };
}

const log = (msg: string, data?: unknown) =>
  process.stderr.write(
    `[mcp-smoke] ${msg}${data !== undefined ? `: ${JSON.stringify(data)}` : ''}\n`,
  );

function fail(msg: string): never {
  process.stderr.write(`[mcp-smoke] FAIL — ${msg}\n`);
  process.exit(1);
}

async function main() {
  const binPath = resolve(import.meta.dirname, '..', 'packages/trendyol/dist/bin/trendyol-mcp.js');
  const child = spawn('node', [binPath], {
    env: { ...process.env, TRENDYOL_USE_MOCK: '1', LOG_LEVEL: 'error' },
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  let stdoutBuffer = '';
  const responses = new Map<number, RpcResponse>();
  const stdoutNonJsonChunks: string[] = [];

  child.stdout.on('data', (chunk) => {
    stdoutBuffer += chunk.toString('utf-8');
    let idx = stdoutBuffer.indexOf('\n');
    while (idx >= 0) {
      const line = stdoutBuffer.slice(0, idx).trim();
      stdoutBuffer = stdoutBuffer.slice(idx + 1);
      if (!line) continue;
      try {
        const obj = JSON.parse(line) as RpcResponse;
        if (typeof obj.id === 'number') responses.set(obj.id, obj);
      } catch {
        stdoutNonJsonChunks.push(line);
      }
      idx = stdoutBuffer.indexOf('\n');
    }
  });

  let stderrAccum = '';
  child.stderr.on('data', (c) => {
    stderrAccum += c.toString();
  });

  const send = (req: RpcRequest) => {
    child.stdin.write(`${JSON.stringify(req)}\n`);
  };
  const waitFor = async (id: number, timeoutMs = 5000): Promise<RpcResponse> => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const r = responses.get(id);
      if (r) return r;
      await new Promise((res) => setTimeout(res, 25));
    }
    throw new Error(`Timed out waiting for response id=${id}`);
  };

  send({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'mcp-smoke', version: '0.1.0' },
    },
  });
  const initRes = await waitFor(1);
  if (initRes.error) fail(`initialize errored: ${initRes.error.message}`);
  log('initialize ok', (initRes.result as { serverInfo?: { name?: string } }).serverInfo);

  send({ jsonrpc: '2.0', method: 'notifications/initialized', params: {} });

  send({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} });
  const listRes = await waitFor(2);
  if (listRes.error) fail(`tools/list errored: ${listRes.error.message}`);
  const tools = (listRes.result as { tools: { name: string }[] }).tools;
  log(`tools/list returned ${tools.length} tools`);
  log(
    'names',
    tools.map((t) => t.name),
  );
  if (tools.length !== 21) fail(`expected 21 tools, got ${tools.length}`);

  send({
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: { name: 'orders_list', arguments: { status: ['Shipped'], size: 2 } },
  });
  const ordersCall = await waitFor(3);
  if (ordersCall.error) fail(`orders_list errored: ${ordersCall.error.message}`);
  const ordersText =
    (ordersCall.result as { content: { type: string; text: string }[] }).content[0]?.text ?? '';
  log('orders_list snippet:', `${ordersText.slice(0, 80)}...`);

  send({
    jsonrpc: '2.0',
    id: 4,
    method: 'tools/call',
    params: { name: 'shipment_providers_list', arguments: {} },
  });
  const provsCall = await waitFor(4);
  if (provsCall.error) fail(`shipment_providers_list errored: ${provsCall.error.message}`);
  log(
    'shipment_providers result first line:',
    ((provsCall.result as { content: { text: string }[] }).content[0]?.text ?? '').split('\n')[0],
  );

  send({
    jsonrpc: '2.0',
    id: 5,
    method: 'tools/call',
    params: {
      name: 'preview_inventory_update',
      arguments: { items: [{ barcode: '8690000000001', quantity: 42 }] },
    },
  });
  const invCall = await waitFor(5);
  if (invCall.error) fail(`preview_inventory_update errored: ${invCall.error.message}`);
  log(
    'preview_inventory_update first line:',
    ((invCall.result as { content: { text: string }[] }).content[0]?.text ?? '').split('\n')[0],
  );

  // Stdout cleanliness check — every line should have been valid JSON-RPC.
  if (stdoutNonJsonChunks.length > 0) {
    fail(
      `Non-JSON output detected on stdout (would corrupt MCP):\n${stdoutNonJsonChunks.join('\n')}`,
    );
  }

  log('stderr (first 200 chars):', stderrAccum.slice(0, 200));
  log('=== ALL CHECKS PASSED ===');

  child.kill();
  await new Promise((r) => setTimeout(r, 100));
  process.exit(0);
}

main().catch((err) => {
  process.stderr.write(`[mcp-smoke] crashed: ${err}\n`);
  if (err instanceof Error && err.stack) process.stderr.write(`${err.stack}\n`);
  process.exit(1);
});
