#!/usr/bin/env bash
set -Eeuo pipefail

if [[ -z "${AWS_REGION:-}" || -z "${RELEASE_SHA:-}" || -z "${ECS_CLUSTER:-}" ||
  -z "${ECS_API_SERVICE:-}" || -z "${ECS_WEB_SERVICE:-}" ||
  -z "${ECS_API_TASK_FAMILY:-}" || -z "${ECS_WEB_TASK_FAMILY:-}" ||
  -z "${ECS_MIGRATOR_TASK_FAMILY:-}" || -z "${ECS_PRIVATE_SUBNETS:-}" ||
  -z "${ECS_TASK_SECURITY_GROUP:-}" || -z "${ECS_DESIRED_COUNT:-}" ||
  -z "${API_HEALTH_URL:-}" || -z "${WEB_HEALTH_URL:-}" ||
  -z "${ECR_API_IMAGE:-}" || -z "${ECR_MIGRATOR_IMAGE:-}" || -z "${ECR_WEB_IMAGE:-}" ]]; then
  printf 'One or more required deployment variables are missing.\n' >&2
  exit 2
fi

if [[ ! "$RELEASE_SHA" =~ ^[0-9a-f]{40}$ ]]; then
  printf 'RELEASE_SHA must be a full lowercase commit SHA.\n' >&2
  exit 2
fi

if [[ ! "$ECS_DESIRED_COUNT" =~ ^[1-9][0-9]*$ ]]; then
  printf 'ECS_DESIRED_COUNT must be a positive integer.\n' >&2
  exit 2
fi

register_task_definition() {
  local family="$1"
  local image="$2"
  local container_name="$3"
  local set_version="$4"
  local command_json="$5"
  local source_file
  local task_file
  local task_arn

  source_file="$(mktemp)"
  task_file="$(mktemp)"
  aws ecs describe-task-definition \
    --task-definition "$family" \
    --query taskDefinition \
    --output json >"$source_file"

  jq \
    --arg image "$image" \
    --arg container "$container_name" \
    --arg version "$RELEASE_SHA" \
    --argjson command "$command_json" '
      del(.taskDefinitionArn, .revision, .status, .requiresAttributes,
          .compatibilities, .registeredAt, .registeredBy, .deregisteredAt)
      | if any(.containerDefinitions[]; .name == $container) then
          .containerDefinitions |= map(
            if .name == $container then
              .image = $image
              | if $command == null then . else .command = $command end
              | if $set_version == "true" then
                  (.environment //= [])
                  | .environment = ([.environment[] | select(.name != "APP_VERSION")]
                    + [{name: "APP_VERSION", value: $version}])
                else . end
            else . end
          )
        else error("Expected container is missing from task definition") end
    ' \
    --arg set_version "$set_version" "$source_file" >"$task_file"

  task_arn="$(aws ecs register-task-definition \
    --cli-input-json "file://${task_file}" \
    --query taskDefinition.taskDefinitionArn \
    --output text)"
  rm -f "$source_file" "$task_file"
  printf '%s' "$task_arn"
}

run_migrations() {
  local migration_task_definition="$1"
  local task_arn
  local task_status
  local exit_code

  task_arn="$(aws ecs run-task \
    --cluster "$ECS_CLUSTER" \
    --launch-type FARGATE \
    --task-definition "$migration_task_definition" \
    --network-configuration "awsvpcConfiguration={subnets=[${ECS_PRIVATE_SUBNETS}],securityGroups=[${ECS_TASK_SECURITY_GROUP}],assignPublicIp=DISABLED}" \
    --query tasks[0].taskArn \
    --output text)"

  if [[ -z "$task_arn" || "$task_arn" == "None" ]]; then
    printf 'ECS did not start the database migration task.\n' >&2
    return 1
  fi

  aws ecs wait tasks-stopped --cluster "$ECS_CLUSTER" --tasks "$task_arn"
  task_status="$(aws ecs describe-tasks --cluster "$ECS_CLUSTER" --tasks "$task_arn" --output json)"
  exit_code="$(jq -r '.tasks[0].containers[] | select(.name == "api-migrate") | .exitCode // empty' <<<"$task_status")"
  if [[ "$exit_code" != "0" ]]; then
    printf 'Database migration task failed; inspect its CloudWatch log stream.\n' >&2
    return 1
  fi
}

api_previous_task=""
web_previous_task=""
api_previous_count=""
web_previous_count=""
api_updated=false
web_updated=false
rolling_back=false

rollback_services() {
  local exit_code="$?"
  trap - ERR
  if [[ "$rolling_back" == "true" ]]; then
    exit "$exit_code"
  fi
  rolling_back=true

  local rollback_failed=false
  if [[ "$api_updated" == "true" && -n "$api_previous_task" ]]; then
    printf 'Deployment failed; restoring the previous API task definition.\n' >&2
    if ! aws ecs update-service \
      --cluster "$ECS_CLUSTER" \
      --service "$ECS_API_SERVICE" \
      --task-definition "$api_previous_task" \
      --desired-count "$api_previous_count"; then
      printf 'Failed to restore the previous API task definition.\n' >&2
      rollback_failed=true
    elif ! aws ecs wait services-stable --cluster "$ECS_CLUSTER" --services "$ECS_API_SERVICE"; then
      printf 'API service did not stabilize after rollback.\n' >&2
      rollback_failed=true
    fi
  fi
  if [[ "$web_updated" == "true" && -n "$web_previous_task" ]]; then
    printf 'Deployment failed; restoring the previous web task definition.\n' >&2
    if ! aws ecs update-service \
      --cluster "$ECS_CLUSTER" \
      --service "$ECS_WEB_SERVICE" \
      --task-definition "$web_previous_task" \
      --desired-count "$web_previous_count"; then
      printf 'Failed to restore the previous web task definition.\n' >&2
      rollback_failed=true
    elif ! aws ecs wait services-stable --cluster "$ECS_CLUSTER" --services "$ECS_WEB_SERVICE"; then
      printf 'Web service did not stabilize after rollback.\n' >&2
      rollback_failed=true
    fi
  fi
  if [[ "$rollback_failed" == "true" ]]; then
    printf 'Automated rollback was incomplete; immediate operator intervention is required.\n' >&2
    exit 1
  fi
  exit "$exit_code"
}

api_previous_task="$(aws ecs describe-services \
  --cluster "$ECS_CLUSTER" \
  --services "$ECS_API_SERVICE" \
  --query services[0].taskDefinition \
  --output text)"
api_previous_count="$(aws ecs describe-services \
  --cluster "$ECS_CLUSTER" \
  --services "$ECS_API_SERVICE" \
  --query services[0].desiredCount \
  --output text)"
web_previous_task="$(aws ecs describe-services \
  --cluster "$ECS_CLUSTER" \
  --services "$ECS_WEB_SERVICE" \
  --query services[0].taskDefinition \
  --output text)"
web_previous_count="$(aws ecs describe-services \
  --cluster "$ECS_CLUSTER" \
  --services "$ECS_WEB_SERVICE" \
  --query services[0].desiredCount \
  --output text)"

migration_task="$(register_task_definition \
  "$ECS_MIGRATOR_TASK_FAMILY" "$ECR_MIGRATOR_IMAGE" api-migrate false '["npx","prisma","migrate","deploy"]')"
run_migrations "$migration_task"

api_task="$(register_task_definition "$ECS_API_TASK_FAMILY" "$ECR_API_IMAGE" api true null)"
web_task="$(register_task_definition "$ECS_WEB_TASK_FAMILY" "$ECR_WEB_IMAGE" web false null)"

trap rollback_services ERR
api_updated=true
aws ecs update-service \
  --cluster "$ECS_CLUSTER" \
  --service "$ECS_API_SERVICE" \
  --task-definition "$api_task" \
  --desired-count "$ECS_DESIRED_COUNT"
aws ecs wait services-stable --cluster "$ECS_CLUSTER" --services "$ECS_API_SERVICE"

web_updated=true
aws ecs update-service \
  --cluster "$ECS_CLUSTER" \
  --service "$ECS_WEB_SERVICE" \
  --task-definition "$web_task" \
  --desired-count "$ECS_DESIRED_COUNT"
aws ecs wait services-stable --cluster "$ECS_CLUSTER" --services "$ECS_WEB_SERVICE"

curl --fail --silent --show-error --max-time 30 "${API_HEALTH_URL%/}/health" >/dev/null
curl --fail --silent --show-error --max-time 30 "${API_HEALTH_URL%/}/ready" >/dev/null
deployed_version="$(curl --fail --silent --show-error --max-time 30 "${API_HEALTH_URL%/}/version" | jq -r '.data.version')"
if [[ "$deployed_version" != "$RELEASE_SHA" ]]; then
  printf 'Deployed API reports version %s instead of %s.\n' "$deployed_version" "$RELEASE_SHA" >&2
  exit 1
fi
curl --fail --silent --show-error --max-time 30 "$WEB_HEALTH_URL" >/dev/null

trap - ERR
printf 'Deployment %s succeeded and passed post-deployment checks.\n' "$RELEASE_SHA"
