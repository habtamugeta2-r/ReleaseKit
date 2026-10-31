# ReleaseKit

ReleaseKit is a small full-stack release dashboard and a reference delivery pipeline. It demonstrates local development, tested application builds, immutable container artifacts, and an approval-gated AWS deployment path.

## Architecture

- `apps/web`: Next.js App Router UI and server-rendered release dashboard.
- `apps/api`: Express 5 API, Prisma/PostgreSQL access, and private S3 integration.
- `infrastructure/aws`: Terraform for the AWS runtime; applying it is a separate, potentially billable operation.
- `.github/workflows`: pull-request checks and guarded deployment workflows.
- `docs`: architecture decisions, OpenAPI specification, local development, AWS setup, and operations.
- `scripts`: deployment helpers used by the CD workflows.

The stack is Next.js, React, TypeScript, Express, PostgreSQL, Prisma, Zod, Vitest, Supertest, Amazon S3, Docker, GitHub Actions, and Terraform.

The production target is ECS Fargate for both containers behind an Application Load Balancer, an RDS PostgreSQL database in private subnets, ECR for images, and a private S3 bucket. The ALB routes `/api/*` to Express and other paths to Next.js. GitHub Actions uses OIDC; production uses a protected GitHub environment. See [the architecture decisions](./docs/architecture.md).

## Requirements

- Node.js 22 or newer and npm 10 or newer
- Docker with Compose, for PostgreSQL and the complete local stack
- AWS account and GitHub environment configuration only for deployment

## Local development

```sh
cp .env.example .env
npm ci
docker compose up -d postgres
npm run db:migrate:dev
npm run dev
```

The web app is served at `http://localhost:3000`; the API is at `http://localhost:4000`. API health endpoints are `/api/v1/health`, `/api/v1/ready`, and `/api/v1/version`. The API refuses to start when required configuration is missing.

Database tables and changes live in `apps/api/prisma/schema.prisma` and `apps/api/prisma/migrations/`; local development applies migrations with `npm run db:migrate:dev`.

Run quality checks with:

```sh
npm run lint
npm run typecheck
npm test
npm run test:coverage
npm run build
```

For the real PostgreSQL integration suite, use the dedicated `releasekit_test` database as described in [local development](./docs/development.md). The regular test command skips that suite unless `TEST_DATABASE_URL` is explicitly set.

See [local development and operations](./docs/development.md), [deployment](./docs/deployment.md), and the [OpenAPI document](./docs/openapi.yaml).

For AWS prerequisites, Terraform planning, and GitHub environment configuration, see [AWS setup](./docs/aws.md).

CI checks pull requests, pushes to `main`, and `vMAJOR.MINOR.PATCH` tag pushes. Staging deployment is opt-in and uses the exact CI-tested commit; production dispatch requires a staged artifact and the protected `production` environment. See the [deployment guide](./docs/deployment.md) for promotion, health checks, rollback, incident handling, backups, secret rotation, and release tagging.

## License

ReleaseKit is distributed under the MIT License. See [LICENSE](./LICENSE).

## Containers

Start the complete local stack, including PostgreSQL, migrations, API, and web app, with:

```sh
docker compose up --build
```

For service status and logs, use `docker compose ps` and `docker compose logs -f api web`. The PostgreSQL volume persists across restarts; `docker compose down -v` deletes it.

## Deployment status

The repository includes infrastructure and workflow definitions, but does not provision AWS resources or deploy automatically merely by being pushed. Configure GitHub environments, OIDC roles, repository variables, and AWS prerequisites as documented before enabling a deployment. Terraform plans should be reviewed for cost and security before apply.

## Project status

This is a deliberately small example: releases are the representative CRUD resource. User-facing authentication and browser-based artifact upload are out of scope; private asset API operations require a server-side bearer token. Production resource creation remains opt-in until infrastructure and cost settings are reviewed.

## Troubleshooting

- If the API exits during startup, check required database settings in `.env`; do not paste secret values into issue reports.
- If readiness fails, inspect API logs with `docker compose logs api` and confirm PostgreSQL is healthy with `docker compose ps`.
- If migrations fail, inspect their output and database connectivity before retrying; production migrations run through the deployment workflow and should not be run manually against production.
- For AWS setup, deployment recovery, or backup restoration, follow [AWS setup](./docs/aws.md) and [deployment operations](./docs/deployment.md).
