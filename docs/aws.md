# AWS infrastructure and GitHub configuration

## Cost and state prerequisites

The Terraform stack creates a public ALB, one NAT gateway serving private subnets in two AZs, private Fargate services, and managed PostgreSQL. These resources have ongoing charges even at low traffic; production RDS is Multi-AZ and costs more. The ECS services are intentionally created with desired count zero. No AWS resources are provisioned by this repository or by GitHub until the operator explicitly applies Terraform and enables deployment.

Before Terraform:

1. Choose the AWS account and region, review the AWS Pricing Calculator, and configure billing alerts.
2. Create a dedicated remote-state S3 bucket with versioning, encryption, public access blocked, and narrowly scoped operator access. The backend lock file uses S3 conditional writes. Keep the bucket outside this stack.
3. Ensure the account has the GitHub Actions OIDC identity provider (`https://token.actions.githubusercontent.com`) with `sts.amazonaws.com` as an audience. The Terraform stacks look up this account-wide provider; create it once outside the separate staging and production states if it is missing.
4. Create and DNS-validate an ACM certificate in the same region as the ALB.
5. Create one Secrets Manager secret per environment with a JSON `token` value containing a random, high-entropy asset API token of at least 32 characters. Keep its ARN in the environment's untracked `.tfvars`.

The RDS master password is generated and rotated by RDS/Secrets Manager; ECS reads the individual secret fields at task startup and constructs a TLS-required PostgreSQL URL. No database password is stored in Terraform variables or GitHub.

## Plan and apply

From `infrastructure/aws`, copy the matching backend example to an ignored local file, replace the bucket and region, and create an untracked `staging.tfvars` or `production.tfvars`:

```hcl
environment             = "staging"
web_origin              = "https://staging.example.com"
certificate_arn         = "arn:aws:acm:us-east-1:123456789012:certificate/..."
asset_token_secret_arn  = "arn:aws:secretsmanager:us-east-1:123456789012:secret:releasekit-staging-assets-..."
```

```sh
terraform init -backend-config=backend.staging.hcl
terraform fmt -check -recursive
terraform validate
terraform plan -var-file=staging.tfvars -out=staging.tfplan
terraform show staging.tfplan
```

Review the plan, IAM policy, public ingress, database size, backups, and estimated costs. Only then run `terraform apply staging.tfplan`. Repeat with a separate state key and variables for production. The stack does not create DNS records; point the chosen HTTPS hostname to the ALB and ensure the certificate covers it.

The sample uses one NAT gateway for both private AZs to limit cost; this creates an AZ-level egress dependency. Production RDS is Multi-AZ, encrypted, private, deletion-protected, and backed up. Review availability and cost trade-offs before use.

## GitHub environments and variables

Create `staging` and `production` environments. Add required reviewers to `production`; the workflow's `environment: production` job pauses until that approval. Configure the repository variable `AWS_DEPLOY_ENABLED` to `true` only after AWS roles and environment variables are ready. Keep it unset or false to leave CD disabled.

For each GitHub environment, configure variables:

| Variable                                                                 | Value                                                     |
| ------------------------------------------------------------------------ | --------------------------------------------------------- |
| `AWS_REGION`                                                             | Terraform region                                          |
| `AWS_ROLE_ARN`                                                           | Environment-specific Terraform output `github_*_role_arn` |
| `ECR_API_REPOSITORY`                                                     | Full Terraform output repository URL                      |
| `ECR_MIGRATOR_REPOSITORY`                                                | Full Terraform output repository URL                      |
| `ECR_WEB_REPOSITORY`                                                     | Full Terraform output repository URL                      |
| `ECS_CLUSTER`                                                            | Terraform output `ecs_cluster_name`                       |
| `ECS_API_SERVICE`, `ECS_WEB_SERVICE`                                     | Terraform service outputs                                 |
| `ECS_API_TASK_FAMILY`, `ECS_WEB_TASK_FAMILY`, `ECS_MIGRATOR_TASK_FAMILY` | Terraform task family outputs                             |
| `ECS_PRIVATE_SUBNETS`                                                    | Comma-separated private subnet IDs                        |
| `ECS_TASK_SECURITY_GROUP`                                                | Terraform output `application_security_group_id`          |
| `ECS_DESIRED_COUNT`                                                      | Positive task count; use at least 2 for production        |
| `API_HEALTH_URL`                                                         | `https://<host>/api/v1`                                   |
| `WEB_HEALTH_URL`                                                         | `https://<host>/`                                         |

These are identifiers and endpoints, not credentials. The only deployment identity is OIDC. The API runtime's asset token is injected directly from Secrets Manager by ECS.

## Release path

1. Pull requests require the CI jobs `Lint, typecheck, test, build` and `Validate container builds`.
2. After merge, successful CI runs trigger staging image publication. ECR repositories reject mutable tags; all three images use the tested commit SHA and the workflow records their digests.
3. The deployment script runs the migration task, updates API and web services, waits for ECS stability, verifies health/readiness/version and frontend HTTP status, and attempts application rollback on failure.
4. For production, create a version tag for a commit that successfully completed staging deployment, then dispatch the production workflow from the protected `main` branch with that commit SHA. The workflow verifies main-branch ancestry, successful CI, and successful staging before it assumes the production OIDC role. It reuses the existing SHA-tagged artifacts rather than rebuilding them.

Database migrations are not rolled back with the application image. Use expand/contract migrations and follow [deployment recovery](./deployment.md#rollback).

## Repository controls still configured in GitHub

Enable branch protection for `main` and require both CI status checks. Configure production environment reviewers and `AWS_DEPLOY_ENABLED` in repository settings. Select the repository license with the owner before adding one; the project currently grants no license.
