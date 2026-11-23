import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import net from 'node:net';
import { once } from 'node:events';
import { WebSocket } from 'ws';

const clientToken = randomBytes(32).toString('base64url');
const digest = createHash('sha256').update(clientToken, 'ascii').digest('hex');

const startupCheck = spawnSync(process.execPath, ['server.mjs'], {
  cwd: new URL('.', import.meta.url),
  env: { ...process.env, TUNNEL_TOKEN_SHA256: '', PORT: '0' },
  encoding: 'utf8',
});
assert.notEqual(startupCheck.status, 0, 'missing token digests must fail startup');
assert.match(startupCheck.stderr, /TUNNEL_TOKEN_SHA256/);

const fixture = net.createServer((socket) => socket.pipe(socket));
fixture.listen(0, '127.0.0.1');
await once(fixture, 'listening');
const fixturePort = fixture.address().port;

const portProbe = net.createServer();
portProbe.listen(0, '127.0.0.1');
await once(portProbe, 'listening');
const servicePort = portProbe.address().port;
portProbe.close();
await once(portProbe, 'close');

const originalCreateConnection = net.createConnection.bind(net);
net.createConnection = (options, ...args) => {
  if (options && typeof options === 'object' && options.host === 'shared-postgres-db-vsq3j1' && options.port === 5432) {
    return originalCreateConnection({ ...options, host: '127.0.0.1', port: fixturePort }, ...args);
  }
  return originalCreateConnection(options, ...args);
};

process.env.TUNNEL_TOKEN_SHA256 = digest;
process.env.LISTEN_HOST = '127.0.0.1';
process.env.PORT = String(servicePort);
const tunnel = await import('./server.mjs');

const baseUrl = `http://127.0.0.1:${servicePort}`;
let ready = false;
let lastHealthResult = 'no response';
for (let attempt = 0; attempt < 50; attempt += 1) {
  try {
    const response = await fetch(`${baseUrl}/healthz`);
    const body = await response.text();
    lastHealthResult = `${response.status} ${JSON.stringify(body)}`;
    if (response.ok && body === 'ok\n') ready = true;
  } catch (error) { lastHealthResult = `${error.message} (${error.cause?.code || 'no cause'})`; /* server may not have bound yet */ }
  if (ready) break;
  await new Promise((resolve) => setTimeout(resolve, 50));
}
assert.equal(ready, true, `health endpoint should start (last result: ${lastHealthResult})`);

const unauthorized = new WebSocket(`${baseUrl.replace('http:', 'ws:')}/v1/postgres`);
const unauthorizedStatus = await new Promise((resolve, reject) => {
  unauthorized.on('unexpected-response', (_request, response) => {
    response.resume();
    resolve(response.statusCode);
  });
  unauthorized.on('error', reject);
});
assert.equal(unauthorizedStatus, 401, 'missing bearer token should be rejected');

const ws = new WebSocket(`${baseUrl.replace('http:', 'ws:')}/v1/postgres`, {
  headers: { authorization: `Bearer ${clientToken}` },
  perMessageDeflate: false,
});
await once(ws, 'open');
const pgBytes = Buffer.from([0x16, 0x03, 0x01, 0x00, 0x04, 0x50, 0x47, 0x21]);
const responsePromise = once(ws, 'message');
ws.send(pgBytes, { binary: true });
const [responseBytes, isBinary] = await responsePromise;
assert.equal(isBinary, true, 'upstream bytes should be returned as binary frames');
assert.deepEqual(responseBytes, pgBytes, 'binary WebSocket bytes should reach the fixed TCP upstream unchanged');

const closePromise = once(ws, 'close');
ws.send('text is forbidden');
const [closeCode] = await closePromise;
assert.equal(closeCode, 1003, 'text WebSocket frames should be rejected');

const notFound = await fetch(`${baseUrl}/not-a-route`);
assert.equal(notFound.status, 404);
const shutdownWs = new WebSocket(`${baseUrl.replace('http:', 'ws:')}/v1/postgres`, {
  headers: { authorization: `Bearer ${clientToken}` },
  perMessageDeflate: false,
});
await once(shutdownWs, 'open');
const gracefulClose = once(shutdownWs, 'close');
const stopping = tunnel.shutdown('verification complete');
const [shutdownCode] = await gracefulClose;
assert.equal(shutdownCode, 1001, 'active WebSocket sessions should receive a graceful shutdown close');
await stopping;
await new Promise((resolve) => fixture.close(resolve));
console.log('Loopback verification passed: startup validation, health, auth rejection, binary forwarding, text rejection, fixed upstream, and graceful shutdown.');
