# ReleaseKit

## Complete Implementation TODO Checklist

**Project:** ReleaseKit — CI/CD and AWS Deployment
**Objective:** Build a production-ready application and an automated delivery pipeline that demonstrates the complete journey from local development to production deployment.

**Technology Stack**

- Frontend: Next.js App Router, React, TypeScript
- Backend: Express 5, TypeScript
- Database: PostgreSQL
- ORM: Prisma
- Validation: Zod
- Testing: Vitest, Supertest
- Object Storage: Amazon S3
- Containerization: Docker
- CI/CD: GitHub Actions
- Cloud Infrastructure: AWS
- API Documentation: OpenAPI
- Version Control: Git and GitHub

## Current implementation status

- Implemented: the Next.js dashboard, Express API, Prisma/PostgreSQL schema and migration, private S3 asset operations, local Compose setup, container build definitions, GitHub Actions workflows, Terraform templates, deployment helper, and project/operations documentation.
- Current local verification: lint, type-check, all 34 API unit tests and 23 web tests, frontend coverage gates, formatting, and both production builds pass. Dashboard coverage is 91.02% statements, 85.29% branches, 88.88% functions, and 92.95% lines; API-client coverage is 100%. Three PostgreSQL integration tests are gated on `TEST_DATABASE_URL` and were skipped in this run; they were previously verified against an isolated test database. The production Next.js standalone server returned HTTP 200, and the same-origin `/api/v1/health` rewrite reached a local mock API. Clean and repeat Prisma migrations, API graceful shutdown, CSS delivery, deployment-script syntax, and whitespace checks were previously verified. `npm audit --audit-level=high` previously exited successfully but reported 11 moderate transitive ESLint/minimatch findings; the suggested automatic fix would downgrade ESLint incompatibly and was not applied.
- Verified in GitHub settings: `main` requires a pull request, one approval, and both CI checks; secret scanning, push protection, Dependabot vulnerability alerts, and Dependabot security updates are enabled. Default workflow token permissions are read-only.
- Not verified here: backend-to-S3 integration and live IAM boundary verification, Docker image/Compose execution, Terraform validation/plan, migrations against an operator-managed database, or a full AWS deployment; Docker, Terraform, and AWS credentials are unavailable.
- Operator actions still pending: review AWS costs and apply Terraform, configure GitHub environments/variables/reviewers, and approve any live deployment.

The checklist below remains the source of task-level completion. A task should only be checked after its stated acceptance criteria have been verified; cloud infrastructure and deployment-specific GitHub settings remain pending.

---

# PHASE 00 — Project Definition and Technical Decisions

## 0.1 Define the project

- [x] Create the ReleaseKit repository.
- [x] Define the project's primary purpose.
- [x] Define the application features.
- [x] Define the CI/CD pipeline objectives.
- [x] Define the expected production architecture.
- [x] Identify what will be automated.
- [x] Identify what requires manual approval.
- [x] Define development, staging, and production environments.
- [x] Define the project's acceptance criteria.
- [x] Establish explicit out-of-scope features.

## 0.2 Lock architectural decisions

- [x] Establish Next.js as the frontend application.
- [x] Establish Express as the only application API backend.
- [x] Establish PostgreSQL as the relational database.
- [x] Establish Prisma as the database access layer.
- [x] Establish Zod as the validation solution.
- [x] Establish Vitest and Supertest as testing tools.
- [x] Establish S3 as the object storage solution.
- [x] Establish Docker as the application containerization solution.
- [x] Establish GitHub Actions as the CI/CD platform.
- [x] Select the AWS hosting architecture.
- [x] Select the AWS database hosting solution.
- [x] Select the Next.js hosting solution.
- [x] Define how frontend and backend communicate.
- [x] Define how environment variables are managed.
- [x] Define how database migrations are executed.
- [x] Define how deployments are rolled back.

**Architecture decision gate**

Before implementation, verify that the selected AWS services support the required Next.js rendering features, Express deployment model, networking, health checks, and deployment requirements.

Do not introduce additional infrastructure without a concrete requirement.

## 0.3 Establish engineering conventions

- [x] Define directory naming conventions.
- [x] Define file naming conventions.
- [x] Define TypeScript configuration standards.
- [x] Define ESLint configuration.
- [x] Define formatting conventions.
- [x] Define import conventions.
- [x] Define environment variable naming conventions.
- [x] Define Git branching conventions.
- [x] Define commit message conventions.
- [x] Define pull request conventions.
- [x] Define error handling conventions.
- [x] Define logging conventions.

**Deliverable:** Approved architecture and technical decisions document.

---

# PHASE 01 — Repository and Development Environment

## 1.1 Initialize repository

- [x] Initialize Git.
- [x] Create the GitHub repository.
- [x] Configure the default branch.
- [ ] Create the development branch if required.
- [x] Create the initial README.
- [x] Create `.gitignore`.
- [x] Create `.editorconfig`.
- [x] Create `.gitattributes`.
- [x] Add the MIT license.
- [x] Add a contribution guide.
- [x] Add a security policy.
- [x] Configure main-branch protection in GitHub; deployment environments and variables remain pending.

## 1.2 Establish project structure

- [x] Create the frontend application directory.
- [x] Create the backend application directory.
- [x] Create infrastructure configuration directories.
- [x] Keep Dockerfiles with applications and Compose at the repository root.
- [x] Create GitHub Actions workflow directory.
- [x] Create documentation directory.
- [x] Create deployment scripts directory.
- [x] Create shared configuration files where appropriate.

Suggested structure:

    releasekit/
    │
    ├── apps/
    │   ├── web/
    │   └── api/
    │
    ├── infrastructure/
    │   ├── aws/
    │   └── docker/
    │
    ├── .github/
    │   └── workflows/
    │
    ├── scripts/
    │
    ├── docs/
    │
    ├── .gitignore
    ├── .editorconfig
    ├── README.md
    └── package.json

Keep the organization simple. Do not introduce a complex monorepo framework unless the implementation actually requires it.

## 1.3 Configure development environment

- [x] Configure Node.js version.
- [x] Configure npm and workspace strategy.
- [x] Configure TypeScript.
- [x] Configure ESLint.
- [x] Configure Prettier.
- [x] Configure environment variable examples.
- [x] Configure local PostgreSQL.
- [ ] Configure local S3-compatible storage if needed.
- [x] Configure development scripts.
- [x] Verify all applications start locally.
- [x] Verify frontend-to-backend communication.

**Acceptance criteria:**

A developer can clone the repository, install dependencies, configure environment variables, start the required services, and run the applications locally.

---

# PHASE 02 — Backend Implementation (Express 5)

## 2.1 Initialize Express application

- [x] Initialize the backend TypeScript project.
- [x] Install Express 5.
- [x] Configure TypeScript compilation.
- [x] Configure development execution.
- [x] Create the application entry point.
- [x] Create the server entry point.
- [x] Separate application initialization from server startup.
- [x] Configure Express middleware.
- [x] Configure JSON request parsing.
- [x] Configure CORS.
- [x] Configure request logging.
- [x] Configure security headers.
- [x] Configure request size limits.
- [x] Configure API versioning.

## 2.2 Establish backend architecture

- [x] Separate routes from controllers.
- [x] Separate controllers from services.
- [x] Separate services from data access.
- [x] Establish a consistent dependency direction.
- [x] Create centralized error handling.
- [x] Create a consistent API response convention.
- [x] Create request validation middleware.
- [x] Create reusable validation schemas.
- [x] Create application configuration.
- [x] Create database configuration.
- [x] Create logging configuration.
- [x] Avoid unnecessary abstractions.

## 2.3 Build an extensible, contract-first API

Keep `/api/v1` backward compatible as the API grows. Treat the OpenAPI specification as the public contract and verify it against the implementation.

### Core resources and operations

- [x] Implement `GET /api/v1/health` as a liveness probe independent of database availability.
- [x] Implement `GET /api/v1/ready` as a dependency-aware readiness probe.
- [x] Implement `GET /api/v1/version`.
- [x] Implement release creation, retrieval, partial updates, listing, and deletion.
- [x] Implement private release-asset upload, download URL generation, and deletion.
- [ ] Define and enforce valid release status transitions; reject transitions that violate the release lifecycle.
- [ ] Add release history so clients can inspect status and metadata changes with actor and timestamp information.
- [x] Add a release-level asset listing operation that returns safe metadata only, never storage keys or credentials.

### Querying and pagination

- [x] Provide bounded page-number pagination and return pagination metadata.
- [x] Add validated filters for release status and creation-time ranges.
- [x] Add bounded, case-insensitive search across release name and version.
- [x] Add allowlisted, deterministic sorting with a stable unique tie-breaker.
- [ ] Add cursor-based pagination for large result sets while preserving the existing page-number contract for current clients.
- [ ] Define consistent behavior for empty results, invalid filters, and cursors that no longer identify a record.

### Reliability and client integration

- [ ] Support idempotency keys on retryable create and asset-upload operations; define key scope, retention, payload-conflict behavior, and replayed responses.
- [ ] Add ETag or equivalent conditional requests for release updates to prevent lost writes; return a clear conflict response for stale versions.
- [ ] Return the request ID consistently in response headers and error bodies, and document how clients can use it for support.
- [ ] Define and document retry guidance for transient server and dependency failures; never recommend retrying validation or authorization failures.
- [ ] Add API authentication and resource-level authorization before exposing release operations to external or multi-user clients. Keep the existing service-to-service asset credential separate from user identity.
- [ ] Apply configurable rate limits to externally reachable operations and return standard rate-limit headers and errors.

### Contract, errors, and compatibility

- [x] Validate request bodies with strict Zod schemas and reject unknown fields.
- [x] Return consistent JSON envelopes and stable machine-readable error codes.
- [x] Use appropriate HTTP status codes and avoid exposing internal exception details.
- [ ] Document every endpoint, parameter, request/response schema, security requirement, and error response in `docs/openapi.yaml`.
- [ ] Define reusable OpenAPI components for pagination, errors, validation details, and authorization.
- [ ] Document deprecation and sunset policy; introduce breaking behavior only through a new API version.
- [ ] Add contract tests that verify implemented routes and representative responses against the OpenAPI specification.
- [ ] Add tests for filters, sorting, cursors, idempotent retries, stale updates, authorization boundaries, and rate-limit behavior.

**Acceptance criteria:**

Clients can discover and use the versioned API from its OpenAPI contract; query behavior is bounded and deterministic; retries and concurrent updates cannot silently duplicate or overwrite writes; and authorization, errors, and compatibility behavior are covered by automated tests.

## 2.4 Implement production readiness

- [x] Configure graceful shutdown.
- [x] Handle termination signals.
- [x] Stop accepting new requests during shutdown.
- [x] Close database connections.
- [x] Configure request timeouts.
- [x] Configure appropriate connection pooling.
- [x] Prevent sensitive information from appearing in logs.
- [x] Configure production logging.
- [x] Verify asynchronous error handling.
- [x] Verify the application does not expose stack traces in production.

**Acceptance criteria:**

The API runs independently, handles errors consistently, exposes operational endpoints, and can shut down gracefully.

---

# PHASE 03 — Database and Prisma

## 3.1 Initialize Prisma

- [x] Install Prisma.
- [x] Configure the Prisma schema.
- [x] Configure PostgreSQL.
- [x] Configure the database connection.
- [x] Initialize the first database model.
- [x] Configure Prisma Client generation.
- [x] Create the database initialization workflow.
- [x] Create the first migration.
- [x] Verify migration execution.
- [x] Verify generated Prisma Client.

## 3.2 Database integration

- [x] Create the database client module.
- [x] Configure connection lifecycle.
- [x] Integrate Prisma with backend services.
- [x] Implement database operations.
- [x] Handle database errors.
- [x] Handle unique constraint violations.
- [x] Handle missing records.
- [x] Confirm no multi-row database operation currently requires a transaction.
- [x] Verify database connection handling.

## 3.3 Migration management

- [x] Establish migration naming conventions.
- [x] Commit migration files to Git.
- [x] Use development migrations during development.
- [x] Use `prisma migrate deploy` in production.
- [x] Prevent production deployment from generating migrations.
- [x] Define migration execution order.
- [x] Define database backup procedures.
- [x] Document migration rollback limitations.
- [x] Test migrations against a clean database.
- [x] Test migrations against an already-migrated database.

**Acceptance criteria:**

The application can initialize a clean database and apply committed migrations consistently across environments.

---

# PHASE 04 — Frontend Implementation (Next.js)

## 4.1 Initialize Next.js

- [x] Create the Next.js application.
- [x] Configure App Router.
- [x] Configure TypeScript.
- [x] Configure ESLint.
- [ ] Configure Tailwind CSS if needed.
- [x] Establish the application layout.
- [x] Establish page organization.
- [x] Establish reusable components.
- [x] Configure environment variables.
- [x] Configure the API base URL.

## 4.2 Implement application interface

- [x] Create the main application page.
- [x] Create the project introduction section.
- [x] Create the deployment overview.
- [x] Create the CI/CD pipeline visualization.
- [x] Display pipeline stages.
- [x] Display deployment status.
- [x] Display application version.
- [x] Display health status.
- [x] Implement loading states.
- [x] Implement error states.
- [x] Implement empty states.
- [x] Implement responsive layouts.
- [x] Verify accessibility basics.

## 4.3 Backend integration

- [x] Establish frontend-to-Express communication.
- [x] Create a reusable API client.
- [x] Implement API request handling.
- [x] Implement API error handling.
- [x] Validate external data where appropriate.
- [x] Configure production API URLs.
- [x] Configure development API URLs.
- [x] Verify CORS configuration.
- [x] Verify frontend and backend production communication.

## 4.4 Frontend production preparation

- [x] Verify production compilation.
- [x] Verify environment variable handling.
- [x] Verify server-side rendering where applicable.
- [x] Verify static asset handling.
- [x] Confirm image optimization is not needed for the current UI.
- [x] Verify runtime configuration.
- [x] Verify application startup in production mode.

**Acceptance criteria:**

The frontend builds successfully, communicates with Express, and works in both development and production configurations.

---

# PHASE 05 — Amazon S3 Integration

## 5.1 S3 configuration

- [ ] Create an AWS S3 bucket.
- [x] Define bucket naming conventions in Terraform.
- [x] Configure bucket region.
- [x] Configure public access blocking in Terraform.
- [x] Configure encryption at rest in Terraform.
- [x] Configure versioning in Terraform.
- [x] Configure a noncurrent-version lifecycle policy in Terraform.
- [x] Define prefix-scoped object access permissions in Terraform.

## 5.2 Backend S3 integration

- [x] Install AWS SDK for JavaScript.
- [x] Configure the S3 client.
- [x] Configure IAM-based authentication through the ECS task role.
- [x] Avoid hardcoded AWS credentials.
- [x] Implement file upload.
- [x] Implement file retrieval through short-lived presigned URLs.
- [x] Implement file deletion.
- [x] Implement presigned URLs for private downloads.
- [x] Validate file size.
- [x] Validate allowed file types and file signatures.
- [x] Propagate upload failures and clean up orphaned objects when metadata writes fail.
- [x] Return a stable not-found error when an S3 object is missing.
- [x] Configure connection and request timeouts.

## 5.3 Security verification

- [x] Test that unauthorized requests cannot access private asset routes.
- [ ] Verify the application cannot access unrelated AWS resources.
- [x] Generate opaque object keys server-side and prevent user-controlled paths.
- [x] Test uploaded content validation.
- [x] Configure buckets to block public access; live access verification remains pending.

**Acceptance criteria:**

The backend can securely interact with S3 using restricted AWS permissions.

---

# PHASE 06 — Testing and Quality Assurance

## 6.1 Configure testing infrastructure

- [x] Install Vitest.
- [x] Install Supertest.
- [x] Configure test environments.
- [x] Configure test scripts.
- [x] Configure isolated PostgreSQL test database in CI.
- [x] Configure test environment variables.
- [x] Separate test and production configurations.
- [x] Configure test cleanup.

## 6.2 Backend testing

- [x] Test application initialization.
- [x] Test health endpoints.
- [x] Test readiness endpoints.
- [x] Test successful API requests.
- [x] Test invalid request bodies.
- [x] Test missing required fields.
- [x] Test invalid parameters.
- [x] Test missing resources.
- [x] Test database operations.
- [x] Test database constraints.
- [x] Test error middleware.
- [x] Test unexpected exceptions.
- [x] Test authorization boundaries if applicable.
- [x] Test graceful shutdown behavior.

## 6.3 Frontend testing

- [x] Test the dashboard and release form behavior.
- [x] Test page rendering.
- [x] Test loading states.
- [x] Test error states.
- [x] Test API integration.
- [x] Test release creation, editing, deletion, and retry interactions.

## 6.4 Integration and production verification

- [x] Test frontend-to-backend communication.
- [x] Test backend-to-database communication.
- [ ] Test backend-to-S3 communication.
- [x] Test environment-specific configurations.
- [x] Test production builds.
- [ ] Test Dockerized applications.
- [x] Verify no tests depend on production resources.

## 6.5 Quality gates

- [x] Configure linting.
- [x] Configure TypeScript type-checking.
- [x] Configure unit tests.
- [x] Configure integration tests.
- [x] Configure frontend production build.
- [x] Configure backend production build.
- [x] Establish and enforce per-file frontend coverage minimums in CI.
- [x] Ensure failed checks prevent deployment.

**Acceptance criteria:**

All required quality checks can run automatically and return a reliable success or failure result.

---

# PHASE 07 — Docker and Containerization

## 7.1 Backend Docker configuration

- [x] Create the API Dockerfile.
- [x] Use an appropriate Node.js base image.
- [x] Use multi-stage builds.
- [x] Install production dependencies appropriately.
- [x] Generate Prisma Client during the build.
- [x] Compile TypeScript.
- [x] Exclude development dependencies from the final runtime.
- [x] Configure the production startup command.
- [x] Configure container ports.
- [x] Configure a non-root runtime user.
- [x] Configure container health checks.
- [x] Avoid including secrets in image layers.

## 7.2 Frontend Docker configuration

- [x] Determine that the selected ECS hosting solution requires a container.
- [x] Create the frontend Dockerfile.
- [x] Use multi-stage builds.
- [x] Configure Next.js standalone production output.
- [x] Configure the production startup command.
- [x] Configure the runtime user.
- [x] Configure container ports.
- [x] Verify production runtime configuration by starting the built standalone server.
- [x] Minimize final image contents with standalone output.

## 7.3 Docker Compose

- [x] Create `compose.yaml`.
- [x] Configure the API service.
- [x] Configure the frontend service for local containers.
- [x] Configure PostgreSQL.
- [x] Configure persistent database storage.
- [x] Configure service networking.
- [x] Configure health checks.
- [x] Configure environment variables.
- [x] Configure startup dependencies.
- [ ] Configure local S3-compatible storage if useful.
- [ ] Verify all required services start together.
- [ ] Verify persistent data survives container restarts.

## 7.4 Image management

- [x] Define Docker image naming conventions.
- [x] Define immutable commit-SHA image tags.
- [x] Tag images with commit SHA.
- [x] Support SemVer Git release tags for CI validation while keeping images SHA-tagged.
- [x] Configure ECR image repositories.
- [x] Configure image retention policies.
- [ ] Verify image reproducibility.
- [ ] Verify images can run independently of the development machine.

**Acceptance criteria:**

The application can run in a reproducible containerized environment without depending on the developer's local configuration.

---

# PHASE 08 — GitHub Actions CI Pipeline

## 8.1 Establish GitHub Actions

- [x] Create `.github/workflows/`.
- [x] Configure workflow naming conventions.
- [x] Configure workflow triggers.
- [x] Configure pull request triggers.
- [x] Configure push triggers.
- [x] Configure CI validation for version-tag pushes.
- [x] Configure least-privilege workflow permissions.
- [x] Configure concurrency controls.
- [x] Configure cancellation of outdated CI workflows.
- [x] Pin third-party actions to verified immutable commit SHAs.

## 8.2 Pull request validation workflow

- [x] Check out repository.
- [x] Configure Node.js.
- [x] Configure dependency caching.
- [x] Install dependencies using the lockfile.
- [x] Run frontend linting.
- [x] Run backend linting.
- [x] Run frontend type-checking.
- [x] Run backend type-checking.
- [x] Run backend unit tests.
- [x] Run frontend tests.
- [x] Run PostgreSQL integration tests.
- [x] Build frontend.
- [x] Build backend.
- [x] Configure Docker build validation.
- [x] Publish JUnit test results as CI artifacts.
- [x] Fail the workflow when any required check fails.

## 8.3 CI optimization

- [x] Avoid unnecessary dependency installations.
- [x] Use dependency caching.
- [x] Separate quality and container validation jobs.
- [x] Order dependent jobs correctly.
- [x] Avoid duplicate workflow executions by limiting push CI to `main` and canceling superseded runs per ref; the post-merge `main` run remains necessary for staging deployment.
- [x] Configure execution timeouts.
- [x] Configure clear job names.
- [x] Make workflow failures easy to diagnose.

## 8.4 Branch protection

- [x] Protect the main branch.
- [x] Require pull requests.
- [x] Require successful CI checks.
- [x] Require one approving review.
- [x] Prevent accidental direct pushes.
- [x] Require branch updates before merge.

**Acceptance criteria:**

A pull request cannot be merged into the protected branch when required quality checks fail.

---

# PHASE 09 — GitHub Actions CD Pipeline

## 9.1 Establish deployment strategy

- [x] Define staging deployment triggers.
- [x] Define production deployment triggers.
- [x] Define annotated `vMAJOR.MINOR.PATCH` release tags; tags validate only and do not deploy.
- [x] Define environment promotion rules.
- [x] Define deployment approval requirements in the workflow; configure reviewers in GitHub before enabling deployment.
- [x] Define deployment failure behavior.
- [x] Define rollback procedures.
- [x] Ensure production deployment uses an existing CI- and staging-verified artifact.

## 9.2 Build and publish artifacts

- [x] Build production frontend artifacts.
- [x] Build production backend artifacts.
- [x] Build Docker images in the staging deployment workflow.
- [x] Assign commit-SHA image tags to immutable ECR repositories.
- [x] Generate image metadata.
- [x] Publish images to ECR in the staging workflow.
- [x] Record image digests.
- [x] Generate an artifact manifest.
- [x] Preserve manifests and prior ECS task definitions for rollback.

## 9.3 Deployment workflow

- [x] Configure staging deployment workflow.
- [x] Configure production deployment workflow.
- [ ] Configure GitHub deployment environments.
- [ ] Configure environment-specific variables.
- [ ] Configure protected production secrets.
- [ ] Configure manual production approval.
- [x] Configure AWS authentication using GitHub OIDC.
- [x] Configure workflows to assume environment-specific IAM roles.
- [x] Execute database migrations as a one-off ECS task before service rollout.
- [x] Deploy the approved application artifact.
- [x] Wait for ECS service stability.
- [x] Verify deployment status.
- [x] Execute post-deployment health checks.
- [x] Record deployment information and image digests.
- [x] Report deployment results in workflow output.

## 9.4 Deployment security

- [x] Avoid permanent AWS access keys in GitHub secrets.
- [x] Configure GitHub OIDC identity federation in Terraform.
- [x] Restrict IAM trust policies to the intended repository and environment.
- [x] Require the production GitHub environment in the deployment workflow.
- [x] Apply least-privilege IAM policies in Terraform.
- [x] Define separate staging and production IAM roles.
- [x] Keep sensitive runtime values in Secrets Manager.
- [x] Prevent secrets from appearing in application and workflow logs.
- [x] Review third-party GitHub Actions and workflow permissions.

**Acceptance criteria:**

A successful merge or approved release can produce and deploy a verified application artifact without manually configuring AWS credentials.

---

# PHASE 10 — AWS Infrastructure

## 10.1 AWS account preparation

- [ ] Configure AWS account.
- [ ] Configure IAM administration securely.
- [ ] Enable appropriate account security controls.
- [ ] Select deployment region.
- [ ] Establish resource naming conventions.
- [ ] Establish resource tagging conventions.
- [ ] Configure cost monitoring.
- [ ] Configure billing alerts.

## 10.2 Networking

- [ ] Define VPC requirements.
- [ ] Define subnet configuration.
- [ ] Configure public and private access boundaries.
- [ ] Configure security groups.
- [ ] Configure required ingress rules.
- [ ] Configure required egress rules.
- [ ] Configure database network access.
- [ ] Verify application-to-database connectivity.
- [ ] Avoid exposing the database publicly.

## 10.3 Backend hosting

- [ ] Select and configure the Express hosting service.
- [ ] Configure the application runtime.
- [ ] Configure production environment variables.
- [ ] Configure the application port.
- [ ] Configure health checks.
- [ ] Configure scaling settings.
- [ ] Configure logging.
- [ ] Configure deployment settings.
- [ ] Verify the service starts successfully.
- [ ] Verify external API access.

## 10.4 Frontend hosting

- [ ] Select the Next.js hosting service.
- [ ] Verify compatibility with the chosen Next.js version.
- [ ] Configure production build settings.
- [ ] Configure environment variables.
- [ ] Configure frontend-to-API connectivity.
- [ ] Configure domain settings.
- [ ] Configure HTTPS.
- [ ] Verify SSR and other required runtime features.
- [ ] Verify production page rendering.

## 10.5 Database hosting

- [ ] Configure managed PostgreSQL.
- [ ] Configure database instance size.
- [ ] Configure database credentials securely.
- [ ] Configure private networking.
- [ ] Configure database security groups.
- [ ] Configure automated backups.
- [ ] Configure backup retention.
- [ ] Configure database monitoring.
- [ ] Configure connection limits.
- [ ] Verify application connectivity.
- [ ] Verify backup restoration procedures.

## 10.6 Storage

- [ ] Create the production S3 bucket.
- [ ] Configure bucket security.
- [ ] Configure encryption.
- [ ] Configure versioning where needed.
- [ ] Configure lifecycle rules.
- [ ] Configure application IAM permissions.
- [ ] Verify S3 access from the deployed backend.

## 10.7 Domain and HTTPS

- [ ] Configure domain names.
- [ ] Configure DNS records.
- [ ] Configure TLS certificates.
- [ ] Configure HTTPS redirects.
- [ ] Configure API domain.
- [ ] Configure frontend domain.
- [ ] Configure CORS for production origins.
- [ ] Verify certificate validity.
- [ ] Verify public accessibility.

**Acceptance criteria:**

All production infrastructure is provisioned, securely configured, and accessible only through the intended network boundaries.

---

# PHASE 11 — Environment and Secrets Management

## 11.1 Environment separation

- [ ] Define development environment.
- [ ] Define testing environment.
- [ ] Define staging environment.
- [ ] Define production environment.
- [ ] Separate environment-specific configurations.
- [ ] Separate environment-specific database connections.
- [ ] Separate storage configuration where appropriate.
- [ ] Separate deployment permissions.

## 11.2 Secret management

- [ ] Identify all sensitive configuration values.
- [ ] Store production secrets in AWS Secrets Manager or an appropriate AWS secret-management service.
- [ ] Configure IAM access to secrets.
- [ ] Configure GitHub environment secrets where necessary.
- [ ] Avoid committing `.env` files.
- [ ] Maintain `.env.example`.
- [ ] Document secret provisioning.
- [ ] Establish secret rotation procedures.
- [ ] Verify secret access restrictions.
- [ ] Verify secrets never appear in build artifacts or logs.

## 11.3 Configuration validation

- [ ] Validate required environment variables at startup.
- [ ] Fail clearly when required configuration is missing.
- [ ] Validate URLs.
- [ ] Validate database configuration.
- [ ] Validate AWS configuration.
- [ ] Validate environment-specific settings.
- [ ] Prevent production from silently using development defaults.

**Acceptance criteria:**

Each environment has explicit, validated configuration and appropriately restricted secret access.

---

# PHASE 12 — Deployment Verification and Rollback

## 12.1 Health verification

- [x] Implement liveness checks.
- [x] Implement readiness checks.
- [x] Verify database connectivity through readiness checks where appropriate.
- [x] Verify application startup.
- [ ] Verify deployment completion.
- [ ] Verify public frontend availability.
- [ ] Verify API availability.
- [ ] Verify API response status.
- [ ] Verify application version.
- [ ] Configure deployment verification timeouts.

## 12.2 Post-deployment testing

- [x] Execute frontend smoke tests.
- [x] Execute backend smoke tests.
- [x] Verify database connectivity.
- [ ] Verify S3 access.
- [x] Verify critical application functionality.
- [ ] Verify production environment configuration.
- [ ] Verify HTTPS.
- [ ] Verify application logs.
- [ ] Mark deployment successful only after verification.

## 12.3 Rollback strategy

- [ ] Define rollback conditions.
- [ ] Preserve previously deployed artifacts.
- [ ] Identify the last known good release.
- [ ] Implement application rollback.
- [ ] Implement deployment failure handling.
- [ ] Document manual rollback procedures.
- [ ] Test rollback in staging.
- [ ] Document database migration rollback limitations.
- [ ] Use backward-compatible database migrations where possible.
- [ ] Define recovery procedures for failed migrations.

**Important:** Rolling back an application image does not automatically reverse database changes. Database migrations must be designed and managed separately.

**Acceptance criteria:**

A failed deployment can be detected, investigated, and recovered using a documented and tested process.

---

# PHASE 13 — Monitoring, Logging, and Reliability

## 13.1 Application monitoring

- [x] Configure application logging.
- [x] Configure structured log output.
- [x] Include timestamps.
- [x] Include log severity.
- [x] Include request identifiers.
- [x] Avoid sensitive information.
- [x] Configure AWS log collection in Terraform.
- [x] Configure log retention in Terraform.
- [ ] Verify logs are accessible.

## 13.2 Infrastructure monitoring

- [ ] Monitor application availability.
- [x] Configure CPU utilization alarms for the API and database.
- [ ] Monitor memory utilization where supported.
- [x] Configure a database CPU health alarm.
- [ ] Monitor database connections.
- [ ] Monitor storage activity.
- [ ] Monitor deployment failures.
- [x] Configure CloudWatch alarms for API and database CPU thresholds.

## 13.3 Alerting

- [ ] Configure application failure alerts.
- [ ] Configure deployment failure alerts.
- [ ] Configure database health alerts.
- [ ] Configure resource utilization alerts.
- [ ] Define alert thresholds.
- [ ] Document alert investigation procedures.

## 13.4 Reliability verification

- [ ] Verify application recovery after restart.
- [ ] Verify database reconnection behavior.
- [ ] Verify failed dependency handling.
- [x] Verify graceful shutdown.
- [ ] Verify startup after deployment.
- [ ] Verify recovery after failed deployment.
- [ ] Verify backup restoration.

**Acceptance criteria:**

Production failures are observable, diagnosable, and recoverable.

---

# PHASE 14 — Security and Supply Chain

## 14.1 Dependency security

- [x] Audit npm dependencies.
- [x] Review the moderate transitive ESLint/minimatch findings and reject the breaking automatic downgrade.
- [x] Establish dependency update procedures with Dependabot.
- [ ] Commit lockfiles.
- [x] Use reproducible dependency installation.
- [x] Configure npm vulnerability scanning in CI and Dependabot alerts/security updates in GitHub.

## 14.2 Code and container security

- [x] Configure GitHub secret scanning and push protection.
- [x] Configure static analysis with ESLint and TypeScript checks.
- [ ] Scan Docker images for vulnerabilities.
- [ ] Use trusted base images.
- [ ] Minimize container privileges.
- [ ] Avoid running as root.
- [ ] Remove unnecessary runtime packages.
- [ ] Review container image contents.

## 14.3 AWS security

- [ ] Apply least-privilege IAM policies.
- [ ] Review IAM trust relationships.
- [ ] Verify OIDC configuration.
- [ ] Verify database isolation.
- [ ] Verify S3 permissions.
- [ ] Verify encryption settings.
- [ ] Verify HTTPS configuration.
- [ ] Review security group rules.
- [ ] Review AWS resource exposure.

## 14.4 GitHub security

- [ ] Protect production environments.
- [x] Restrict workflow permissions to read-only by default and grant deployment OIDC only to deployment jobs.
- [x] Review GitHub Actions dependencies; all referenced actions are pinned to verified commit SHAs.
- [ ] Protect deployment workflows.
- [ ] Restrict access to production secrets.
- [x] Review repository permissions; only the repository owner is a direct collaborator.
- [x] Scan working files and Git history for common credential patterns; no real credentials were found.

**Acceptance criteria:**

The application and delivery pipeline follow reasonable production security practices without unnecessary enterprise complexity.

---

# PHASE 15 — Production Release

## 15.1 Pre-release verification

- [ ] Verify all required tests pass.
- [ ] Verify all builds succeed.
- [ ] Verify Docker images build.
- [ ] Verify database migrations.
- [ ] Verify staging deployment.
- [ ] Verify staging smoke tests.
- [ ] Verify production configuration.
- [ ] Verify AWS permissions.
- [ ] Verify backups.
- [ ] Verify rollback readiness.
- [ ] Review release notes.

## 15.2 Production deployment

- [ ] Create a release tag.
- [ ] Generate production artifacts.
- [ ] Publish immutable artifacts.
- [ ] Request production approval.
- [ ] Execute database migrations.
- [ ] Deploy the approved artifacts.
- [ ] Wait for deployment completion.
- [ ] Execute health checks.
- [ ] Execute smoke tests.
- [ ] Verify frontend accessibility.
- [ ] Verify API accessibility.
- [ ] Verify database connectivity.
- [ ] Verify S3 integration.
- [ ] Confirm deployment success.

## 15.3 Release management

- [ ] Generate release notes.
- [ ] Record deployed commit SHA.
- [ ] Record artifact image digests.
- [ ] Record deployment timestamp.
- [ ] Record deployment environment.
- [ ] Preserve deployment history.
- [ ] Document release verification.

**Acceptance criteria:**

A version-controlled application release can be deployed to production through a controlled and traceable pipeline.

---

# PHASE 16 — Documentation

## 16.1 Main README

- [x] Write project introduction.
- [x] Explain the project's purpose.
- [x] Document the technology stack.
- [x] Document architecture.
- [x] Document repository structure.
- [x] Document prerequisites.
- [x] Document installation.
- [x] Document local development.
- [x] Document environment variables.
- [x] Document database setup.
- [x] Document testing.
- [x] Document Docker usage.
- [x] Document deployment.
- [x] Document production architecture.
- [x] Document CI/CD workflow.
- [x] Document troubleshooting.

## 16.2 Technical documentation

- [x] Document architecture decisions.
- [x] Document API endpoints.
- [x] Publish OpenAPI specification.
- [x] Document database migrations.
- [x] Document environment configuration.
- [x] Document Docker architecture.
- [x] Document GitHub Actions workflows.
- [x] Document AWS infrastructure.
- [x] Document IAM permissions.
- [x] Document deployment procedures.
- [x] Document rollback procedures.
- [x] Document monitoring.
- [x] Document backup and restoration.
- [x] Document security practices.

## 16.3 Operational documentation

- [x] Create staging deployment guide.
- [x] Create production deployment guide.
- [x] Create release checklist.
- [x] Create incident response guide.
- [x] Create failed deployment troubleshooting guide.
- [x] Create database recovery guide.
- [x] Create secret rotation guide.
- [x] Create infrastructure maintenance guide.

**Acceptance criteria:**

Another developer can understand, run, deploy, troubleshoot, and maintain the project using its documentation.

---

# PHASE 17 — Final Production Audit

## 17.1 Functional verification

- [ ] Frontend works.
- [ ] Backend works.
- [ ] Database works.
- [ ] S3 integration works.
- [ ] API documentation works.
- [ ] Health endpoints work.
- [ ] Production configuration works.

## 17.2 CI/CD verification

- [ ] Pull request triggers CI.
- [ ] Linting runs automatically.
- [ ] Type-checking runs automatically.
- [ ] Tests run automatically.
- [ ] Production builds run automatically.
- [ ] Failed checks block merging.
- [ ] Approved releases trigger deployment.
- [ ] AWS authentication uses OIDC.
- [ ] Artifacts are versioned.
- [ ] Production approval works.
- [ ] Deployment verification works.
- [ ] Failed deployments are detected.
- [ ] Rollback works.

## 17.3 Infrastructure verification

- [ ] Frontend is publicly accessible through HTTPS.
- [ ] API is accessible through HTTPS.
- [ ] Database is not publicly exposed.
- [ ] S3 permissions are restricted.
- [ ] Secrets are protected.
- [ ] Logs are available.
- [ ] Monitoring is configured.
- [ ] Backups are configured.
- [ ] Cost monitoring is enabled.

## 17.4 Final project quality

- [ ] Remove unused dependencies.
- [ ] Remove unused code.
- [x] Remove generated test reports, coverage output, and TypeScript build metadata.
- [x] Review local configuration; no production development secrets are present.
- [x] Review all environment files; only the placeholder `.env.example` is present.
- [x] Review Git history for common credential and private-key patterns.
- [x] Review documentation links; no broken relative links found.
- [x] Review repository structure against the documented layout.
- [x] Verify a clean installation.
- [ ] Verify a complete deployment from a fresh release.
- [ ] Verify production recovery procedures.

---

# FINAL DEFINITION OF DONE

ReleaseKit is complete when all of the following are demonstrably true:

1. A developer can clone the repository and run the application locally.
2. The frontend and backend build independently.
3. PostgreSQL migrations execute reliably.
4. The application can interact with private S3 storage.
5. Docker images can be built and executed independently.
6. Opening a pull request automatically triggers quality checks.
7. Failed checks prevent merging.
8. Merging approved changes produces validated production artifacts.
9. Production artifacts are immutable and traceable to Git commits.
10. GitHub Actions authenticates with AWS using OIDC.
11. Staging deployment is automated.
12. Production deployment requires the configured approval.
13. Database migrations execute through a controlled deployment process.
14. Deployment health checks verify the deployed application.
15. Deployment failures are reported.
16. Application rollback is documented and tested.
17. Production logs and monitoring are available.
18. AWS resources follow appropriate security practices.
19. Another developer can reproduce the deployment using documentation.

---

# IMPLEMENTATION RULES FOR CODING AGENTS

These rules apply throughout the entire implementation.

1. Follow the phases sequentially.
2. Do not skip unfinished prerequisites.
3. Do not implement future phases prematurely.
4. Inspect the existing repository before modifying anything.
5. Preserve working functionality when improving existing code.
6. Follow the approved architecture.
7. Do not replace Express with Next.js API routes or another backend framework.
8. Do not introduce unnecessary libraries.
9. Do not introduce infrastructure that is not required.
10. Never hardcode production credentials.
11. Never commit secrets.
12. Never deploy unverified artifacts.
13. Never deploy to production without the configured approval.
14. Never assume deployment succeeded without verification.
15. Add tests alongside the functionality they verify.
16. Update documentation when implementation decisions change.
17. Verify commands and scripts before marking tasks complete.
18. Do not mark a task complete merely because its code exists.
19. Report blockers instead of silently skipping them.
20. Do not modify approved architectural decisions without explaining the reason and obtaining authorization.

## Required execution procedure

For every implementation phase:

1. Inspect the current project state.
2. Identify the exact tasks and dependencies.
3. Implement a small, logically related group of tasks.
4. Run the relevant checks.
5. Fix any failures.
6. Verify the actual behavior.
7. Update the relevant documentation.
8. Update the TODO checklist.
9. Report completed tasks and remaining tasks.
10. Proceed to the next group only when its prerequisites are satisfied.

## Required progress report

After each implementation group, report:

- Phase and task identifiers.
- What was implemented.
- Files created.
- Files modified.
- Dependencies added.
- Commands executed.
- Tests performed.
- Test results.
- Architectural decisions made.
- Problems encountered.
- Remaining tasks.
- Whether the acceptance criteria were satisfied.

**Final principle:**

A task is complete only when its implementation has been verified. Code existing in the repository is not sufficient evidence of completion.
