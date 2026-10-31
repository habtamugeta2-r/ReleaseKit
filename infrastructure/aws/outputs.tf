output "load_balancer_dns_name" {
  description = "Configure DNS and the ACM certificate for this HTTPS endpoint."
  value       = aws_lb.application.dns_name
}

output "api_url" {
  value = "https://${aws_lb.application.dns_name}/api/v1"
}

output "web_url" {
  value = "https://${aws_lb.application.dns_name}"
}

output "s3_bucket_name" {
  value = aws_s3_bucket.assets.bucket
}

output "ecs_cluster_name" {
  value = aws_ecs_cluster.application.name
}

output "ecs_api_service_name" {
  value = aws_ecs_service.api.name
}

output "ecs_web_service_name" {
  value = aws_ecs_service.web.name
}

output "ecs_migrator_task_definition_arn" {
  value = aws_ecs_task_definition.migrator.arn
}

output "ecs_api_task_family" {
  value = aws_ecs_task_definition.api.family
}

output "ecs_web_task_family" {
  value = aws_ecs_task_definition.web.family
}

output "ecs_migrator_task_family" {
  value = aws_ecs_task_definition.migrator.family
}

output "ecr_api_repository_url" {
  value = aws_ecr_repository.api.repository_url
}

output "ecr_migrator_repository_url" {
  value = aws_ecr_repository.migrator.repository_url
}

output "ecr_web_repository_url" {
  value = aws_ecr_repository.web.repository_url
}

output "private_subnet_ids" {
  value = aws_subnet.private[*].id
}

output "application_security_group_id" {
  value = aws_security_group.application.id
}

output "github_staging_role_arn" {
  value = aws_iam_role.github_deploy["staging"].arn
}

output "github_production_role_arn" {
  value = aws_iam_role.github_deploy["production"].arn
}
