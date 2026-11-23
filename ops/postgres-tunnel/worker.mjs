const UPSTREAM_URL = 'http://postgres-tunnel:8080/v1/postgres';
const TOKEN_PATTERN = /^Bearer [\x21-\x7e]{32,256}$/;

function plain(status, message) {
  return new Response(`${message}\n`, {
    status,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'GET' && url.pathname === '/healthz' && url.search === '') {
      try {
        const healthRequest = new Request('http://postgres-tunnel:8080/healthz', {
          method: 'GET',
        });
        const healthResponse = await env.POSTGRES_GATEWAY.fetch(healthRequest);
        return healthResponse.status === 200
          ? plain(200, 'ok')
          : plain(502, 'gateway unavailable');
      } catch {
        return plain(502, 'gateway unavailable');
      }
    }

    if (request.method !== 'GET' || url.pathname !== '/v1/postgres' || url.search !== '') {
      return plain(404, 'not found');
    }

    const authorization = request.headers.get('authorization') || '';
    if (!TOKEN_PATTERN.test(authorization)) {
      return plain(401, 'unauthorized');
    }

    if ((request.headers.get('upgrade') || '').toLowerCase() !== 'websocket') {
      return plain(426, 'upgrade required');
    }

    try {
      // The VPC service binding pins the network destination. Keep this URL fixed
      // and pass only the two headers needed for the WebSocket client handshake.
      const upstreamRequest = new Request(UPSTREAM_URL, {
        method: 'GET',
        headers: {
          authorization,
          upgrade: 'websocket',
        },
      });
      const upstreamResponse = await env.POSTGRES_GATEWAY.fetch(upstreamRequest);

      if (upstreamResponse.status === 401) {
        return plain(401, 'unauthorized');
      }

      if (upstreamResponse.status !== 101 || !upstreamResponse.webSocket) {
        return plain(502, 'gateway unavailable');
      }

      // Returning the runtime WebSocket response directly preserves the upgraded
      // stream without terminating or inspecting its PostgreSQL TLS bytes here.
      return upstreamResponse;
    } catch {
      return plain(502, 'gateway unavailable');
    }
  },
};
