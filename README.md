# TD Banking

TD Banking is a self-hosted simulated banking demo. It stores fictional accounts, balances, and transfers in SQLite. It does not connect to a real bank or move real money, and it does not require a banking or other service subscription. Hosting costs depend on where you run it.

## Requirements

- Node.js 24 LTS
- npm

## Local setup

Install dependencies:

```sh
npm ci
```

Create `.env.local` from the example file, then set these values:

```sh
cp .env.example .env.local
```

```dotenv
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=<unique random secret>
DATABASE_PATH=.data/td-banking.sqlite
```

Generate a 32-byte secret with Node.js, then use the printed value for `BETTER_AUTH_SECRET`:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

The local database directory is created automatically. Keep the auth secret private and do not commit it.

Start the development server:

```sh
npm run dev
```

Open <http://localhost:3000>.

## Production run

Use a persistent host with Node.js 24 LTS. Configure `BETTER_AUTH_URL` with the app's HTTPS origin, set a unique `BETTER_AUTH_SECRET`, and set `DATABASE_PATH` to an absolute path on persistent storage **outside the release directory**. Ensure the app user can read and write that path.

Install, build, and start the app with:

```sh
npm ci
npm run build
npm start
```

For each release, point the new app version at the same persistent database path. Stop the app briefly during the release switch, then start the new version. Do not create a fresh database path for each release; that would make existing accounts and balances appear missing.

## SQLite backups and restore

Back up the database regularly. Use SQLite's online backup API or the `sqlite3` backup command, for example:

```sh
sqlite3 "$DATABASE_PATH" ".backup '/secure/backups/td-banking-backup.sqlite'"
```

Do not make a live backup by copying only the database file; SQLite may have recent writes in its journal or WAL. Check a copy of the backup with SQLite's integrity check:

```sh
sqlite3 /secure/backups/td-banking-backup.sqlite "PRAGMA integrity_check;"
```

The expected output is `ok`. Test that backups can be opened and restored.

To restore, briefly stop the app first. Save a separate copy of the current database so writes made since the selected backup are preserved, then restore the chosen backup to the configured path and restart the app. Never overwrite the only copy of the current database.

## Checks

Run the project checks:

```sh
npm run lint
npm run typecheck
npm test
npm run build
```
