import { mkdirSync } from "node:fs";
import { dirname, isAbsolute, relative, sep } from "node:path";
import { DatabaseSync } from "node:sqlite";

let database: DatabaseSync | undefined;

/** Open the persistent auth database only when the first auth request arrives. */
export function getDatabase(): DatabaseSync {
  if (database) return database;

  const configuredPath = process.env.DATABASE_PATH;
  if (process.env.NODE_ENV === "production" && (!configuredPath || !isAbsolute(configuredPath))) {
    throw new Error("Production requires an absolute DATABASE_PATH on persistent storage outside the release directory.");
  }

  const databasePath = configuredPath || ".data/td-banking.sqlite";
  if (databasePath === ":memory:") {
    throw new Error("DATABASE_PATH must name a persistent file; :memory: databases do not persist.");
  }

  if (process.env.NODE_ENV === "production") {
    const releaseRelativePath = relative(process.cwd(), databasePath);
    if (
      releaseRelativePath === "" ||
      (!releaseRelativePath.startsWith(`..${sep}`) && releaseRelativePath !== ".." && !isAbsolute(releaseRelativePath))
    ) {
      throw new Error("Production DATABASE_PATH must be outside the application release directory.");
    }
  }

  mkdirSync(/*turbopackIgnore: true*/ dirname(databasePath), { recursive: true });

  const connection = new DatabaseSync(databasePath);
  connection.exec("PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
  database = connection;
  return connection;
}
