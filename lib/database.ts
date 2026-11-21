import { mkdirSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { DatabaseSync } from "node:sqlite";

let database: DatabaseSync | undefined;

/** Open the persistent auth database only when the first auth request arrives. */
export function getDatabase(): DatabaseSync {
  if (database) return database;

  const configuredPath = process.env.DATABASE_PATH;
  if (process.env.NODE_ENV === "production" && (!configuredPath || !isAbsolute(configuredPath))) {
    throw new Error("Production requires an absolute DATABASE_PATH on persistent storage outside the release directory.");
  }

  const databasePath = configuredPath
    ? isAbsolute(configuredPath)
      ? configuredPath
      : resolve(process.cwd(), configuredPath)
    : resolve(process.cwd(), ".data", "td-banking.sqlite");

  if (process.env.NODE_ENV === "production") {
    const releaseRelativePath = relative(resolve(process.cwd()), databasePath);
    if (
      releaseRelativePath === "" ||
      (!releaseRelativePath.startsWith(`..${sep}`) && releaseRelativePath !== ".." && !isAbsolute(releaseRelativePath))
    ) {
      throw new Error("Production DATABASE_PATH must be outside the application release directory.");
    }
  }

  mkdirSync(dirname(databasePath), { recursive: true });

  const connection = new DatabaseSync(databasePath);
  connection.exec("PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
  database = connection;
  return connection;
}
