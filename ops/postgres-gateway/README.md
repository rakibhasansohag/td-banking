# PostgreSQL gateway

This Compose template exposes only the `td_banking` database through PgBouncer
on TLS port `6432`. PgBouncer joins the existing external `dokploy-network` and
connects privately to `shared-postgres-db-vsq3j1:5432`. It does not publish the
PostgreSQL service or expose PgBouncer's administrative console.

The image is pinned to PgBouncer 1.26.1 by multi-platform manifest digest
`sha256:1b24dd6759158d0349ddb1d1112c0800535dca5b90ba53f8d5a63a3da97d1a3b`.
The published image manifest lists amd64 and arm64. The image's default command
is `/usr/bin/pgbouncer /etc/pgbouncer/pgbouncer.ini`; the Compose bind mount
overrides the config at that path without changing the command. The image is
third-party-built from an upstream PgBouncer release, so verify the digest and
platform against your deployment registry before upgrading it.

## Prepare secrets

Create `ops/postgres-gateway/secrets/` on the Dokploy host. The directory is
ignored by Git. Supply these files through your secret-management process:

| File | Purpose |
| --- | --- |
| `gateway.crt`, `gateway.key` | Gateway TLS server certificate and private key. Its SAN must match the public hostname used by Vercel. |
| `client-ca.crt` | CA that issued the Vercel client certificate. PgBouncer requires and verifies that client certificate. |
| `upstream-ca.crt` | CA that issued the private PostgreSQL service certificate. The certificate must validate for `shared-postgres-db-vsq3j1`. |
| `userlist.txt` | PgBouncer SCRAM entries for `td_banking_app` and, only during migrations, `td_banking_migrator`. |

The gateway uses mutual TLS from Vercel to PgBouncer and verifies TLS from
PgBouncer to PostgreSQL. Restrict host port 6432 at the firewall to Vercel's
configured egress addresses where stable egress is available; the client
certificate is an additional access check. Do not expose port 5432 publicly.
Keep private keys and the userlist readable by the container's `postgres`
user and inaccessible to other host users.

Each userlist record has PgBouncer's standard form:

```text
"td_banking_app" "SCRAM-SHA-256$<iterations>:<salt>$<storedkey>:<serverkey>"
```

The SCRAM verifier must be byte-for-byte the same verifier stored by PostgreSQL
for that login. Provision the PostgreSQL role password and corresponding
PgBouncer verifier with a trusted secret workflow; do not commit either value.
Do not add a database mapping that forces a shared upstream user: each client
login must authenticate to PostgreSQL as its own role.

## Provision database roles

Run `roles.sql` as a PostgreSQL administrator connected to `td_banking`. It
creates two separate logins without embedding passwords, revokes database
CONNECT and TEMPORARY from `PUBLIC`, and grants CONNECT only to the two roles.
`td_banking_migrator` can create objects in `public`; `td_banking_app` receives
DML privileges on existing objects and default privileges for objects the
migrator creates. Keep the administrator login out of `userlist.txt` and Vercel.

For the application, set `DATABASE_URL` to the gateway hostname on port 6432,
database `td_banking`, and user `td_banking_app`. Set `DATABASE_CA_CERT`,
`DATABASE_CLIENT_CERT`, and `DATABASE_CLIENT_KEY` in Vercel to the PEM contents
needed to validate the gateway and present the client certificate. The
application's database URL should not carry SSL query parameters; its pool
configuration reads TLS material from those variables.

For the migration command, temporarily provision the `td_banking_migrator`
SCRAM entry in `userlist.txt` and set `MIGRATION_DATABASE_URL` to the same
gateway endpoint using that role. Run the repository's documented migration
command, then remove the migrator entry from the gateway userlist when no
migration is in progress. PgBouncer uses `pool_mode=session` so the migration
process's session advisory lock remains attached to one PostgreSQL connection.
Do not point application traffic at the migrator role.

The Compose default binds port 6432 to loopback. After verifying gateway
certificates, SCRAM roles, firewall rules, and the migration/runtime userlist
entries, explicitly set `PGBOUNCER_BIND_IP` to the host interface address for
live ingress (or `0.0.0.0` when the host firewall restricts the published port):

```sh
PGBOUNCER_BIND_IP=<host-interface-ip> docker compose -f ops/postgres-gateway/compose.yml up -d
```

Run this from the repository root after provisioning secret files and
confirming `dokploy-network` exists. Check PgBouncer logs and verify TLS
connectivity from an authorized client before setting Vercel variables.

For local fixture testing, bind only to loopback with
`PGBOUNCER_BIND_IP=127.0.0.1 docker compose -f ops/postgres-gateway/compose.yml up -d`.
This changes only the host-side listener; connect the container to a disposable
fixture network and use test-only certificates, userlist, and PgBouncer config
before running a local PostgreSQL fixture. Do not point this local test setup at
the Dokploy production database.
