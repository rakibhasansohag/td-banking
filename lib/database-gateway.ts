import { createWebSocketStream, WebSocket } from "ws";
import type { Duplex } from "node:stream";
import type { Socket } from "node:net";

const POSTGRES_GATEWAY_PATH = "/v1/postgres";
const GATEWAY_HANDSHAKE_TIMEOUT_MS = 5_000;
const GATEWAY_MAX_PAYLOAD_BYTES = 1024 * 1024;

type SocketCompatibleStream = Duplex & {
  connect: (port?: number, host?: string) => SocketCompatibleStream;
  setNoDelay: (noDelay?: boolean) => SocketCompatibleStream;
  setKeepAlive: (enable?: boolean, initialDelay?: number) => SocketCompatibleStream;
  ref: () => SocketCompatibleStream;
  unref: () => SocketCompatibleStream;
};

type WebSocketWithSocket = WebSocket & { _socket?: Socket };

function gatewayURL(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("DATABASE_GATEWAY_URL must be a valid WSS URL ending in /v1/postgres.");
  }

  if (
    url.protocol !== "wss:" ||
    url.pathname !== POSTGRES_GATEWAY_PATH ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error("DATABASE_GATEWAY_URL must be a WSS URL ending in /v1/postgres without credentials or extra parameters.");
  }

  return url.toString();
}

/** Create the raw socket stream pg wraps with its normal, verified PostgreSQL TLS session. */
export function createDatabaseGatewayStreamFactory(url: string, token: string): () => Duplex {
  const endpoint = gatewayURL(url);
  if (token.length < 32 || token.length > 256 || !/^[\x20-\x7e]+$/.test(token)) {
    throw new Error("DATABASE_GATEWAY_TOKEN must contain 32 to 256 printable ASCII characters.");
  }

  return () => {
    const socket = new WebSocket(endpoint, {
      headers: { Authorization: `Bearer ${token}` },
      handshakeTimeout: GATEWAY_HANDSHAKE_TIMEOUT_MS,
      followRedirects: false,
      perMessageDeflate: false,
      maxPayload: GATEWAY_MAX_PAYLOAD_BYTES,
    });
    const stream = createWebSocketStream(socket) as SocketCompatibleStream;
    let keepAlive = false;
    let keepAliveDelay = 0;
    let noDelay = true;
    let referenced = true;

    // pg expects a net.Socket interface. The WebSocket stream is the raw duplex
    // transport; connect is signaled only after the authenticated WSS handshake.
    stream.connect = () => stream;
    stream.setNoDelay = (enabled = true) => {
      noDelay = enabled;
      (socket as WebSocketWithSocket)._socket?.setNoDelay(enabled);
      return stream;
    };
    stream.setKeepAlive = (enable = false, initialDelay = 0) => {
      keepAlive = enable;
      keepAliveDelay = initialDelay;
      (socket as WebSocketWithSocket)._socket?.setKeepAlive(enable, initialDelay);
      return stream;
    };
    stream.ref = () => {
      referenced = true;
      (socket as WebSocketWithSocket)._socket?.ref();
      return stream;
    };
    stream.unref = () => {
      referenced = false;
      (socket as WebSocketWithSocket)._socket?.unref();
      return stream;
    };

    socket.once("open", () => {
      const underlyingSocket = (socket as WebSocketWithSocket)._socket;
      underlyingSocket?.setNoDelay(noDelay);
      if (keepAlive) underlyingSocket?.setKeepAlive(true, keepAliveDelay);
      if (!referenced) underlyingSocket?.unref();
      stream.emit("connect");
    });
    socket.on("message", (_data, isBinary) => {
      if (!isBinary) stream.destroy(new Error("PostgreSQL gateway sent a non-binary frame."));
    });
    // ws emits close and the stream pushes EOF; destroy it after EOF so pg also
    // receives the socket-like close event it relies on for connection cleanup.
    stream.once("end", () => stream.destroy());

    return stream;
  };
}
