# Deployment and operations

## Target architecture

Terraform provisions ECS Fargate, ECR, an Application Load Balancer, private RDS PostgreSQL, S3, IAM roles, logs, alarms, and networking. This infrastructure can incur ongoing charges. Do not apply it until the AWS account, region, expected cost, and environment configuration have been reviewed. Follow the [AWS setup guide](./aws.md) for backend state, resource prerequisites, and required GitHub variables.

## GitHub setup

1. Configure repository environments named `staging` and `production`; add required reviewers to `production`.
2. Configure AWS IAM OIDC trust restricted to this repository and the matching GitHub environment subject.
3. Configure `AWS_ROLE_ARN`, `AWS_REGION`, ECR repository names, ECS cluster/service names, and API smoke-test URL as environment-specific variables.
4. Configure `ASSET_ACCESS_TOKEN` and database credentials in AWS Secrets Manager and grant the ECS task role access only to the required secrets and `release-assets/*` bucket prefix.
5. Apply infrastructure from a reviewed Terraform plan. Keep database and application tasks in private subnets.

Never put AWS access keys, production database credentials, or `.env` content in workflow files or image build arguments.

## Deployment sequence

CI checks pull requests, pushes to `main`, and version-tag pushes. After a successful push to `main`, the staging workflow builds each application and publishes immutable images tagged with the commit SHA. Production is dispatched from the protected `main` branch for a commit that already passed CI and staging; it reuses those images and pauses for the `production` environment approval. The deployment runs the committed Prisma migrations as an ECS task, updates the ECS services, waits for stability, and checks `/api/v1/health` and `/api/v1/ready`.

## Release version tags

Use annotated Git tags in `vMAJOR.MINOR.PATCH` format for stable releases, and only tag commits already on `main` that have passed CI and staging. Pushing a version tag runs CI validation but does not deploy. ECR images remain immutably tagged by commit SHA; staging and production continue to use the verified SHA, and production still requires the configured environment approval.

```sh
git tag -a v1.2.3 <verified-commit-sha> -m "Release v1.2.3"
git push origin v1.2.3
```

## Rollback

On failed health verification, inspect the workflow and ECS deployment events, then redeploy the previous recorded image digest. Do not automatically reverse database migrations. Use expand/contract migrations; restore a database backup only under the documented recovery procedure and after assessing data loss.

## Database backup and recovery

RDS automated backups are configured with the environment's `db_backup_retention_days` value (seven days by default). Before a release that changes data shape or during an incident:

1. Confirm the latest automated backup and its recovery point in the RDS console or with `aws rds describe-db-instances`; do not assume a migration is a backup.
2. Obtain incident approval and choose a point-in-time recovery target that minimizes data loss.
3. Restore to a new private DB instance in the same private subnet group and with the database security group; do not overwrite or publicly expose the original instance.
4. Verify the restored schema and data, run application smoke checks against the restored instance, and document the selected recovery point.
5. Coordinate application connection changes as a separate approved operation. Keep the original instance until the recovered service is verified and the incident owner approves cleanup.

Point-in-time recovery creates a separate RDS instance and incurs cost. Review recovery targets, access, and cost before proceeding. Never include database credentials in commands, logs, or incident notes.

## Operational verification

Check ECS service events, CloudWatch logs and alarms, RDS health/backups, and ALB target health. Deployment records include commit SHA, environment, image tags/digests, and run URL. Rotate secrets through Secrets Manager and redeploy affected tasks; do not print secret values while diagnosing issues.

## Release checklist

Before a staging or production deployment:

- Confirm CI passed for the exact commit, including tests, database migrations, builds, and container builds.
- Confirm the target environment's OIDC role and deployment variables match the reviewed Terraform outputs.
- Confirm the database backup window/retention, migration compatibility, image digests, and rollback task definitions.
- For production, confirm the `production` environment has required reviewers and obtain its approval before deployment continues.

After deployment, verify the recorded commit/version, ECS service stability, API liveness/readiness, frontend response, and CloudWatch task logs. A deployment is not complete if a smoke check fails, even if ECS reports the service stable.

## Failed deployment response

1. Preserve the failed workflow run URL, release SHA, ECS service events, and relevant CloudWatch log stream names; never copy secret values into notes.
2. Determine whether the migration task failed or an application service failed. Do not retry a failed migration blindly; inspect its output and Prisma migration state first.
3. If application health checks failed after migration succeeded, use the deployment workflow's previous-task-definition rollback, then verify both services and database readiness.
4. If the migration changed the database incompatibly, stop application rollout and follow the reviewed database recovery procedure. Application rollback does not reverse database changes.
5. Escalate incomplete rollback or suspected data loss to the incident owner; preserve the original database until recovery is verified.

## Secret rotation and infrastructure maintenance

Rotate the asset bearer token in AWS Secrets Manager, update the corresponding staging/production secret, and redeploy the API task so it loads the new value. The GitHub workflow uses OIDC and has no long-lived AWS access key to rotate. For Terraform updates, use the correct environment state, review `terraform plan`, and obtain cost/security approval before applying; do not edit production infrastructure directly in the console without recording the state change.
