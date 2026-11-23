# PostgreSQL WebSocket tunnel

This service presents a PostgreSQL TCP stream as authenticated binary WebSocket
frames at `/v1/postgres`. The WebSocket terminates inside the tunnel service;
PostgreSQL TLS still runs end-to-end from the application to PostgreSQL. The
server forwards bytes only to `shared-postgres-db-vsq3j1:5432` on
`dokploy-network`; callers cannot choose a target host, port, or database.
There is no published container port and no public PostgreSQL listener.

The Compose project has the stable service name `postgres-tunnel`. The
Cloudflare Tunnel sidecar reaches it at `http://postgres-tunnel:8080` over a
private Compose network. The sidecar alone does not join `dokploy-network`.
Cloudflare terminates public HTTPS and forwards WebSocket upgrades to this
private HTTP origin. `cloudflared` is pinned to the current official
`2026.11.1` image tag, listed as the latest version on the [official Docker Hub
tags page](https://hub.docker.com/r/cloudflare/cloudflared/tags) on 2026-11-23.
Upgrade that tag deliberately after checking the [official release
instructions](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/downloads/update-cloudflared/).

## Dokploy and Cloudflare setup

Deploy this directory as a Docker Compose app from the repository's Git source,
or transfer the directory and use its `compose.yml`. Build the `postgres-tunnel`
service from the included Dockerfile. Ensure Dokploy's host has the existing
external `dokploy-network`. Do not add a published port or Traefik route for
port 8080; only the sidecar should reach the service.

In Dokploy's app environment, set:

| Variable | Value |
| --- | --- |
| `TUNNEL_TOKEN` | Server-only token for the Cloudflare remotely managed Tunnel. Never set this in Vercel or commit it. |
| `TUNNEL_TOKEN_SHA256` | Comma-separated lowercase SHA-256 hex digests for 1–8 client bearer tokens. No plaintext client token. |

In Cloudflare **Networking → Tunnels**, create a remotely managed Tunnel.
Under **Workers VPC → Services**, add an HTTP service on that tunnel pointing
to `postgres-tunnel` on port `8080`. Bind the VPC service to the Worker as
`POSTGRES_GATEWAY`. [wrangler.jsonc](wrangler.jsonc) contains the project's
binding and [worker.mjs](worker.mjs) contains the Worker code. Deploy from the
repository root with `npx wrangler deploy --config ops/postgres-tunnel/wrangler.jsonc`
in the Cloudflare account that owns the tunnel. The Worker uses a separate
`workers.dev` hostname because the portfolio zone's Bot Fight Mode challenges
Vercel's automated requests. Workers VPC is free while in beta.

Generate a distinct high-entropy client token per application. Send only the
raw token to that app's server-side secret store and put its digest in Dokploy.
For example, run locally in a trusted terminal and record each output in the
matching secret store:

```sh
node -e "const c=require('node:crypto'); const t=c.randomBytes(32).toString('base64url'); console.log('client token:',t); console.log('Dokploy digest:',c.createHash('sha256').update(t,'ascii').digest('hex'))"
```

To add a second app later, append its digest to `TUNNEL_TOKEN_SHA256`,
comma-separated, and give that app only its own raw token. Remove the digest
when retiring the app. The gateway accepts printable ASCII tokens from 32 to
256 characters; startup fails if the digest list is empty, malformed, repeated,
or longer than eight entries. Authentication uses SHA-256 and constant-time
digest comparisons. The tunnel does not map bearer tokens to PostgreSQL roles:
PostgreSQL TLS, database ACLs, and each app's database role remain the data
authorization boundary.

## Application configuration

### TD Banking on Vercel

Keep the existing `DATABASE_URL`, `DATABASE_CA_CERT`, `DATABASE_CLIENT_CERT`,
and `DATABASE_CLIENT_KEY` in **Production**. The host in `DATABASE_URL` is
also the PostgreSQL TLS certificate name. The gateway takes over the network
connection, so its WebSocket hostname goes in a separate variable.

| Variable | Value |
| --- | --- |
| `DATABASE_GATEWAY_URL` | `wss://shared-postgres-gateway.rakibhasansohag133.workers.dev/v1/postgres` |
| `DATABASE_GATEWAY_TOKEN` | The raw token issued for this app, saved as a Vercel secret |

Deploy after saving both values. Sign in with a demo account and check that
its accounts and transaction history load. Then clear **External Port** on the
PostgreSQL service in Dokploy. Check that an outside connection to port 6432
fails and the demo still works. Changing the port can restart PostgreSQL, so
wait for it to be ready before testing again.

### Other apps

For an application with WebSocket support, use
`wss://shared-postgres-gateway.rakibhasansohag133.workers.dev/v1/postgres` and send
`Authorization: Bearer <client token>` during the WebSocket upgrade. Send
PostgreSQL client bytes in binary frames and treat received binary frames as
PostgreSQL server bytes. Do not use text frames. Keep the PostgreSQL driver's
TLS enabled so the inner TLS session reaches PostgreSQL unchanged; validate its
certificate for the hostname on its server certificate, currently
`db.rakibhasansohag.com`. A WebSocket TLS certificate only
authenticates the public Cloudflare edge, not PostgreSQL.

Each app needs its own database, login, password, and, under the current
PostgreSQL access rules, a client certificate for that login. An app hosted
inside Dokploy can connect over `dokploy-network` with the appropriate
PostgreSQL TLS and role settings.

The service permits up to 32 active sessions, limits each WebSocket payload to
1 MiB, rejects non-binary frames, bounds forwarding buffers, caps idle sessions
at 15 minutes, and caps each session at 12 hours. `/healthz` returns `200 ok`
without requiring a token and reveals no configuration. Logs contain service
events only; never add authorization headers, tokens, or PostgreSQL bytes to
logs.

## Local loopback verification

The local Node verification harness uses a disposable loopback PostgreSQL-shaped
TCP echo fixture and patches the fixed upstream connector in-process; it does
not use Docker or contact the Dokploy database. Run it from the repository root:

```sh
node ops/postgres-tunnel/verify-loopback.mjs
```
