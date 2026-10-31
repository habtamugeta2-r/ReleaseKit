# Local development

## Prerequisites

Install Node.js 22+, npm 10+, and Docker with the Compose plugin. Copy `.env.example` to `.env`; do not commit `.env`.

## First run

```sh
npm ci
docker compose up -d postgres
npm run db:migrate:dev
npm run dev
```

The API listens on port 4000, and Next.js listens on port 3000. The API's health, readiness, version, and release endpoints are under `/api/v1`. The web app proxies `/api` to the local API.

To verify the optimized standalone web server after building, start the API and database as above, then run `npm run start --workspace=@releasekit/web`. The start script stages Next.js static/public assets into the standalone output before launching the server entrypoint used by the web container.

To stop local services, use `docker compose down`. To preserve the database volume, do not pass `-v`. Resetting development data is destructive and should only be done intentionally with `npm run db:reset`.

## Checks

```sh
npm run lint
npm run typecheck
npm test
npm run test:coverage
npm run build
```

The test suite does not contact production systems. API tests use an injected repository; the PostgreSQL integration path is available through the local Compose service. Test commands write ignored JUnit reports under each app's `test-results/` directory; CI uploads those reports as a workflow artifact. Frontend coverage includes the dashboard and API client, with per-file minimums of 85% for statements, functions, and lines and 80% for branches; CI enforces these thresholds.

The database integration suite runs when `TEST_DATABASE_URL` is set and requires a separate database named `releasekit_test`; it refuses other database names and never truncates tables. CI provisions this database in an ephemeral PostgreSQL service, applies migrations, reapplies them to verify an already-migrated database, and runs the suite as part of `npm test`. To opt in locally with the Compose PostgreSQL service:

```sh
docker compose exec postgres createdb -U releasekit releasekit_test
DATABASE_URL='postgresql://releasekit:releasekit@localhost:5432/releasekit_test?schema=public' npm run db:migrate:deploy
TEST_DATABASE_URL='postgresql://releasekit:releasekit@localhost:5432/releasekit_test?schema=public' npm test
```

Only use `releasekit_test` for this suite. Do not point `TEST_DATABASE_URL` at a development, staging, or production database.

## Container workflow

Build and start all local services with `docker compose up --build`. Compose waits for PostgreSQL, runs the committed migrations, then starts the API and web services after their health checks pass. Use `docker compose ps` to inspect service health and `docker compose logs -f api web migrate` to follow application and migration logs. The named PostgreSQL volume survives `docker compose down`; `docker compose down -v` removes the volume and all local database data.

The API and web Dockerfiles use multi-stage builds and run as the unprivileged Node.js user. The web image uses Next.js standalone output. CI builds the API runtime, migration, and web images; actual Docker execution should be verified on a machine with Docker installed.

## Database workflow

Edit `apps/api/prisma/schema.prisma`, then create and verify a local migration with `npm run db:migrate:dev`. Commit both the schema and migration directory. Deployments use `prisma migrate deploy`; production migrations are never generated during deployment.
