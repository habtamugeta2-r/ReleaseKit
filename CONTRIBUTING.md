# Contributing

Use a short-lived branch and open a pull request against `main`. Keep changes focused, add or update tests, and update the applicable documentation and implementation checklist.

Before requesting review, run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`. Commit subjects use the Conventional Commits style (`feat:`, `fix:`, `docs:`, `ci:`, `test:`, `chore:`). Do not commit credentials, `.env` files, generated build output, or production data.

Deployment and infrastructure changes require review of IAM scope, network exposure, migration compatibility, and expected AWS cost.
