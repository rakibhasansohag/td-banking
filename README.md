# TD Banking

TD Banking is a self-hosted simulated banking demo. It stores fictional accounts, balances, and transfers in PostgreSQL. It does not connect to a real bank or move real money.

## Requirements

- Node.js 24 LTS
- npm
- PostgreSQL

## Local setup

Install dependencies and copy the example environment file:

```sh
npm ci
cp .env.example .env.local
```

Set the local app and database values in `.env.local`:

```dotenv
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=<unique random secret>
DATABASE_URL=postgresql://td_banking:password@localhost:5432/td_banking
MIGRATION_DATABASE_URL=postgresql://td_banking_migrator:password@localhost:5432/td_banking
```

`DATABASE_URL` is used by the running app. `MIGRATION_DATABASE_URL` is required by the migration command and should connect to the same database with permission to create or update tables. Generate a secret with Node.js and use the printed value for `BETTER_AUTH_SECRET`:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

If your PostgreSQL service requires TLS, set the relevant PEM values in the environment. These variables accept PEM contents, including literal newlines or `\n` escapes:

```dotenv
DATABASE_CA_CERT=
DATABASE_CLIENT_CERT=
DATABASE_CLIENT_KEY=
```

Keep database credentials, TLS private keys, and the auth secret private. Do not commit them.

Create the local database and role used by the connection strings. Run the migrations before starting the app. The command applies Better Auth migrations first, then the banking schema migration:

```sh
npm run db:migrate
```

Start the development server:

```sh
npm run dev
```

Open <http://localhost:3000>.

For tests, set `TEST_DATABASE_URL` to an isolated, disposable PostgreSQL database on the local machine. Tests reject non-loopback hosts and may create or modify the database schema and data. Never point it at production or a persistent development database. Runtime and migration commands do not use `TEST_DATABASE_URL`.

```sh
TEST_DATABASE_URL=postgresql://td_banking_test:password@localhost:5432/td_banking_test npm test
```

## Production deployment

Deploy the complete Next.js application to Vercel or Dokploy and connect it to a persistent PostgreSQL database. Set `BETTER_AUTH_URL` to the app's canonical HTTPS origin and configure `BETTER_AUTH_SECRET`, `DATABASE_URL`, and `MIGRATION_DATABASE_URL` as deployment secrets. Add the TLS PEM environment values if the database requires them. Do not use `TEST_DATABASE_URL` in production.

Run the migration command once against the production database before the new app version receives traffic:

```sh
npm run db:migrate
```

The migration process uses a database advisory lock, so concurrent invocations serialize. Keep the runtime database URL available to the app after the migration succeeds.

### Vercel

Deploy the whole Next.js app to Vercel. Use a PostgreSQL service reachable from the app's server runtime, preferably in the same region. Set the production environment variables in Vercel, then run the migration command from a release job or another controlled Node.js 24 environment with the production migration URL before promoting the release. Include preview database URLs only when preview deployments should have their own isolated data.

### Dokploy

Deploy the Next.js app and a PostgreSQL service in Dokploy. Keep PostgreSQL data on a persistent volume and use the database's internal service hostname in the app's `DATABASE_URL` and `MIGRATION_DATABASE_URL`. Run the migration command as a pre-deploy or release step before switching traffic to the new app version.

## Checks

Run the project checks:

```sh
npm run lint
npm run typecheck
npm test
npm run build
```
