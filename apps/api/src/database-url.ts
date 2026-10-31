export const DATABASE_POOL_MAX = 5;

export interface DatabaseEnvironment {
  DATABASE_URL?: string;
  DB_HOST?: string;
  DB_PORT?: string;
  DB_NAME?: string;
  DB_USER?: string;
  DB_PASSWORD?: string;
}

export function resolveDatabaseUrl(
  environment: DatabaseEnvironment,
): string | undefined {
  if (environment.DATABASE_URL) {
    return environment.DATABASE_URL;
  }

  const { DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD } = environment;
  if (!DB_HOST || !DB_NAME || !DB_USER || !DB_PASSWORD) {
    return undefined;
  }
  const port = Number(DB_PORT ?? "5432");
  if (
    !/^[A-Za-z0-9.-]+$/.test(DB_HOST) ||
    !/^[A-Za-z0-9_]+$/.test(DB_NAME) ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535
  ) {
    return undefined;
  }

  const url = new URL("postgresql://localhost");
  url.hostname = DB_HOST;
  url.port = port.toString();
  url.username = DB_USER;
  url.password = DB_PASSWORD;
  url.pathname = `/${DB_NAME}`;
  url.searchParams.set("schema", "public");
  url.searchParams.set("connection_limit", DATABASE_POOL_MAX.toString());
  url.searchParams.set("sslmode", "require");
  return url.toString();
}
