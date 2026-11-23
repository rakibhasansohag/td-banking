import { createHash, timingSafeEqual } from 'node:crypto';
import { createServer } from 'node:http';
import net from 'node:net';
import { WebSocketServer, WebSocket } from 'ws';

const UPSTREAM_HOST = 'shared-postgres-db-vsq3j1';
const UPSTREAM_PORT = 5432;
const LISTEN_HOST = process.env.LISTEN_HOST || '0.0.0.0';
const LISTEN_PORT = Number(process.env.PORT || 8080);
const MAX_SESSIONS = 32;
const MAX_PAYLOAD_BYTES = 1024 * 1024;
const MAX_TOKEN_CHARS = 256;
const MIN_TOKEN_CHARS = 32;
const MAX_TOKEN_DIGESTS = 8;
const CONNECT_TIMEOUT_MS = 8000;
const SESSION_MAX_MS = 12 * 60 * 60 * 1000;
const IDLE_TIMEOUT_MS = 15 * 60 * 1000;
const HEARTBEAT_INTERVAL_MS = 30 * 1000;
const WS_HIGH_WATER_BYTES = 2 * 1024 * 1024;
const WS_LOW_WATER_BYTES = 512 * 1024;
const TCP_HIGH_WATER_BYTES = 2 * 1024 * 1024;
const SHUTDOWN_GRACE_MS = 8000;

function loadTokenDigests(value) {
  const entries = (value || '').split(',').map((item) => item.trim());
  if (entries.length === 0 || entries.length > MAX_TOKEN_DIGESTS || entries.some((item) => !/^[a-f0-9]{64}$/.test(item))) {
    throw new Error(`TUNNEL_TOKEN_SHA256 must contain 1-${MAX_TOKEN_DIGESTS} comma-separated lowercase SHA-256 hex digests`);
  }
  const digests = entries.map((item) => Buffer.from(item, 'hex'));
  if (new Set(entries).size !== entries.length) throw new Error('TUNNEL_TOKEN_SHA256 contains duplicate digests');
  return digests;
}

const tokenDigests = loadTokenDigests(process.env.TUNNEL_TOKEN_SHA256);

function isAuthorized(req) {
  const authorization = req.headers.authorization;
  if (typeof authorization !== 'string' || !authorization.startsWith('Bearer ')) return false;
  const token = authorization.slice(7);
  if (token.length < MIN_TOKEN_CHARS || token.length > MAX_TOKEN_CHARS || !/^[\x21-\x7e]+$/.test(token)) return false;
  const candidate = createHash('sha256').update(token, 'ascii').digest();
  let matched = 0;
  for (const digest of tokenDigests) matched |= Number(timingSafeEqual(candidate, digest));
  return matched === 1;
}

const clients = new Set();
let stopping = false;

const httpServer = createServer({ maxHeaderSize: 4096 }, (req, res) => {
  if (req.method === 'GET' && req.url === '/healthz') {
    res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' });
    res.end('ok\n');
    return;
  }
  res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' });
  res.end('not found\n');
});

httpServer.headersTimeout = 5000;
httpServer.requestTimeout = 10000;
httpServer.keepAliveTimeout = 5000;
httpServer.maxHeadersCount = 32;

const webSocketServer = new WebSocketServer({
  noServer: true,
  clientTracking: false,
  maxPayload: MAX_PAYLOAD_BYTES,
  perMessageDeflate: false,
  maxFragments: 64,
  maxBufferedChunks: 1024,
  skipUTF8Validation: false,
});

httpServer.on('upgrade', (req, socket, head) => {
  socket.setTimeout(5000);
  socket.on('timeout', () => socket.destroy());
  if (stopping || req.url !== '/v1/postgres') {
    socket.write('HTTP/1.1 404 Not Found\r\nConnection: close\r\nContent-Length: 0\r\n\r\n');
    socket.destroy();
    return;
  }
  if (!isAuthorized(req)) {
    socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\nContent-Length: 0\r\n\r\n');
    socket.destroy();
    return;
  }
  if (clients.size >= MAX_SESSIONS) {
    socket.write('HTTP/1.1 503 Service Unavailable\r\nConnection: close\r\nContent-Length: 0\r\n\r\n');
    socket.destroy();
    return;
  }

  socket.setTimeout(0);
  webSocketServer.handleUpgrade(req, socket, head, (ws) => {
    webSocketServer.emit('connection', ws, req);
  });
});

function closeSession(ws, tcp, code = 1000, reason = 'session ended') {
  if (tcp && !tcp.destroyed) tcp.destroy();
  if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
    try { ws.close(code, reason); } catch { ws.terminate(); }
  }
}

webSocketServer.on('connection', (ws) => {
  if (stopping || clients.size >= MAX_SESSIONS) {
    ws.close(1013, 'capacity unavailable');
    return;
  }

  const session = { ws, tcp: null, alive: true, lastActivity: Date.now(), closing: false };
  clients.add(session);
  const connectTimer = setTimeout(() => closeSession(ws, session.tcp, 1011, 'upstream unavailable'), CONNECT_TIMEOUT_MS);
  connectTimer.unref();
  const maxAgeTimer = setTimeout(() => closeSession(ws, session.tcp, 1001, 'session lifetime reached'), SESSION_MAX_MS);
  maxAgeTimer.unref();

  const tcp = net.createConnection({ host: UPSTREAM_HOST, port: UPSTREAM_PORT });
  session.tcp = tcp;
  tcp.setNoDelay(true);
  tcp.setKeepAlive(true, HEARTBEAT_INTERVAL_MS);

  const finish = () => {
    if (session.closing) return;
    session.closing = true;
    clearTimeout(connectTimer);
    clearTimeout(maxAgeTimer);
    clients.delete(session);
    if (!tcp.destroyed) tcp.destroy();
    if (ws.readyState === WebSocket.OPEN) ws.close(1000, 'session ended');
    else if (ws.readyState === WebSocket.CONNECTING) ws.terminate();
  };

  tcp.setTimeout(IDLE_TIMEOUT_MS, () => closeSession(ws, tcp, 1001, 'idle timeout'));
  tcp.on('connect', () => clearTimeout(connectTimer));
  tcp.on('data', (chunk) => {
    session.lastActivity = Date.now();
    tcp.setTimeout(IDLE_TIMEOUT_MS);
    if (ws.readyState !== WebSocket.OPEN) return;
    try {
      ws.send(chunk, { binary: true }, (error) => {
        if (error) closeSession(ws, tcp, 1011, 'upstream forwarding failed');
        else if (tcp.isPaused() && ws.bufferedAmount < WS_LOW_WATER_BYTES) tcp.resume();
      });
    } catch {
      closeSession(ws, tcp, 1011, 'upstream forwarding failed');
      return;
    }
    if (ws.bufferedAmount >= WS_HIGH_WATER_BYTES) tcp.pause();
  });
  tcp.on('drain', () => {
    if (ws._socket?.isPaused()) ws._socket.resume();
  });
  tcp.on('error', () => closeSession(ws, tcp, 1011, 'upstream unavailable'));
  tcp.on('close', finish);

  ws.on('pong', () => { session.alive = true; });
  ws.on('message', (data, isBinary) => {
    if (!isBinary) {
      closeSession(ws, tcp, 1003, 'binary frames required');
      return;
    }
    session.lastActivity = Date.now();
    tcp.setTimeout(IDLE_TIMEOUT_MS);
    if (tcp.destroyed || !tcp.writable) {
      closeSession(ws, tcp, 1011, 'upstream unavailable');
      return;
    }
    const bytes = Buffer.isBuffer(data) ? data : Buffer.from(data);
    if (tcp.writableLength + bytes.length > TCP_HIGH_WATER_BYTES) {
      closeSession(ws, tcp, 1013, 'upstream backpressure limit');
      return;
    }
    if (!tcp.write(bytes)) ws._socket?.pause();
  });
  ws.on('error', () => closeSession(ws, tcp, 1011, 'tunnel failed'));
  ws.on('close', finish);
});

const heartbeat = setInterval(() => {
  const now = Date.now();
  for (const session of clients) {
    if (now - session.lastActivity > IDLE_TIMEOUT_MS) {
      closeSession(session.ws, session.tcp, 1001, 'idle timeout');
      continue;
    }
    if (!session.alive) {
      closeSession(session.ws, session.tcp, 1001, 'peer heartbeat timeout');
      continue;
    }
    session.alive = false;
    if (session.ws.readyState === WebSocket.OPEN) session.ws.ping();
  }
}, HEARTBEAT_INTERVAL_MS);
heartbeat.unref();

httpServer.on('clientError', (_error, socket) => socket.destroy());
httpServer.listen(LISTEN_PORT, LISTEN_HOST, () => {
  console.log(JSON.stringify({ event: 'listening', host: LISTEN_HOST, port: LISTEN_PORT, upstream: `${UPSTREAM_HOST}:${UPSTREAM_PORT}` }));
});

let shutdownPromise;
export function shutdown(signal = 'manual') {
  if (shutdownPromise) return shutdownPromise;
  stopping = true;
  clearInterval(heartbeat);
  console.log(JSON.stringify({ event: 'shutdown', signal, sessions: clients.size }));
  const serverClosed = new Promise((resolve) => httpServer.close(resolve));
  for (const session of clients) {
    if (session.ws.readyState === WebSocket.OPEN) session.ws.close(1001, 'server shutting down');
    if (session.tcp && !session.tcp.destroyed) session.tcp.end();
  }
  const forceTimer = setTimeout(() => {
    for (const session of clients) {
      session.ws.terminate();
      session.tcp?.destroy();
    }
  }, SHUTDOWN_GRACE_MS);
  forceTimer.unref();
  shutdownPromise = serverClosed.finally(() => clearTimeout(forceTimer));
  return shutdownPromise;
}

process.on('SIGTERM', () => { void shutdown('SIGTERM'); });
process.on('SIGINT', () => { void shutdown('SIGINT'); });
