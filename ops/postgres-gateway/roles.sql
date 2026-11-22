-- Run as a PostgreSQL administrator connected to td_banking.
-- Provision actual passwords out of band; never add them to this file.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'td_banking_migrator') THEN
    CREATE ROLE td_banking_migrator;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'td_banking_app') THEN
    CREATE ROLE td_banking_app;
  END IF;
END
$$;

ALTER ROLE td_banking_migrator LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
ALTER ROLE td_banking_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;

REVOKE CONNECT, TEMPORARY ON DATABASE td_banking FROM PUBLIC;
GRANT CONNECT ON DATABASE td_banking TO td_banking_migrator, td_banking_app;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE, CREATE ON SCHEMA public TO td_banking_migrator;
GRANT USAGE ON SCHEMA public TO td_banking_app;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO td_banking_app;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO td_banking_app;

ALTER DEFAULT PRIVILEGES FOR ROLE td_banking_migrator IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO td_banking_app;
ALTER DEFAULT PRIVILEGES FOR ROLE td_banking_migrator IN SCHEMA public
  GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO td_banking_app;
