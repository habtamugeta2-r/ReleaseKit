# Architecture decisions

Status: accepted for this implementation.

## Purpose and scope

ReleaseKit demonstrates the complete software-delivery path with a small release-tracking application. Users can create, inspect, edit, and delete release records. The UI presents release status alongside API health and application version. This is not an authentication or artifact-distribution product.

## Technology and service decisions

| Concern             | Decision                                        | Rationale                                                                    |
| ------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------- |
| Web                 | Next.js App Router, React, TypeScript           | Required UI stack; SSR is retained.                                          |
| API                 | Express 5, TypeScript                           | The only application API; Next.js does not implement business endpoints.     |
| Data                | PostgreSQL with Prisma migrations               | Managed relational data with committed schema history.                       |
| Validation          | Zod                                             | Shared boundary validation for configuration and requests.                   |
| Tests               | Vitest and Supertest                            | Fast TypeScript tests and HTTP-level API tests.                              |
| Object storage      | Private S3 bucket via AWS SDK v3                | IAM-authenticated server-side access; no public object ACLs.                 |
| Containers          | Docker multi-stage builds and Compose           | Reproducible runtime and local PostgreSQL.                                   |
| CI/CD               | GitHub Actions                                  | PR gates, artifact build, environment-protected deployment.                  |
| AWS runtime         | ECS Fargate services behind an ALB              | Supports long-running Express and Next.js SSR containers with health checks. |
| Database hosting    | RDS PostgreSQL in private subnets               | Managed backups and no public database endpoint.                             |
| Next.js hosting     | ECS Fargate container                           | Preserves Next.js SSR/runtime behavior without a second hosting platform.    |
| Registry            | ECR                                             | Private storage of SHA-tagged container images.                              |
| Deployment identity | GitHub OIDC into environment-specific IAM roles | Avoids long-lived AWS credentials in GitHub.                                 |

This architecture has ongoing AWS costs (notably NAT gateways, ALB, Fargate, and RDS). No resources are created by local development or by `terraform plan`; review the plan and cost estimate before applying.

## Request and deployment flow

The ALB routes `/api/*` to Express and all other paths to Next.js. The browser uses same-origin `/api/v1`; local Next.js rewrites that path to the API service. ECS tasks run in private subnets. The ALB is public; RDS and S3 remain private/restricted. The API obtains AWS credentials from its task role, not environment-stored access keys. Asset upload/download/delete operations are service-to-service only and require a 256-bit bearer token; the browser never receives this token. S3 calls use 3-second connection and 30-second request timeouts. The API validates file signatures, stores objects under random server-generated keys, issues 120-second signed download URLs, and prevents deleting releases that still own assets.

Pull requests run checks only. A successful push to `main` can build and publish immutable SHA-tagged images and deploy to a configured staging environment. Production is dispatched from `main` for an existing commit that passed CI and staging, and is gated by the GitHub `production` environment's approval rules. Production validates branch ancestry and successful CI/staging runs before obtaining OIDC credentials. Deployment jobs use only OIDC credentials and only deploy already-built artifacts. Migrations run as a one-off ECS task before service rollout. Application rollback uses the previous task definition; database rollback is not assumed and migrations must be backward-compatible.

## Configuration and operations

`.env.example` documents local settings; actual `.env` files are ignored. Production secrets belong in AWS Secrets Manager or protected GitHub environment variables only when a workflow needs them. Configuration is validated on process startup. The PostgreSQL pool is capped at five connections per API process; size ECS task counts against the database connection limit. No multi-row database operation currently needs a transaction: single-statement writes are atomic, and foreign keys enforce asset ownership constraints. The upload workflow crosses PostgreSQL and S3, so it uses compensating object cleanup rather than implying a cross-system transaction. Logs are structured JSON and omit request bodies, authorization headers, and secret values. Readiness checks database availability; liveness does not depend on downstream services.

## Conventions

- npm workspaces; application code under `apps/`, infrastructure under `infrastructure/`, operational guidance under `docs/`.
- TypeScript strict mode; lowercase kebab-case file names.
- Conventional commit subjects (`feat:`, `fix:`, `docs:`, `ci:`); short-lived branches and pull requests.
- API errors use a stable `{ error: { code, message, requestId } }` envelope; validation failures are 400, missing resources 404, and unexpected failures 500 without stack traces in production.
- Dependency direction: HTTP routes/controllers -> services -> Prisma/S3 adapters. Services do not depend on Express request/response objects.
- Repository license has not been selected; no license grant is implied.
