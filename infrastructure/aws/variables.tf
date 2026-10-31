variable "aws_region" {
  description = "AWS region for all regional resources."
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Lowercase project prefix used in AWS resource names."
  type        = string
  default     = "releasekit"
}

variable "environment" {
  description = "Deployment environment."
  type        = string

  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "environment must be staging or production."
  }
}

variable "github_repository" {
  description = "GitHub owner/repository allowed to assume deployment roles."
  type        = string
  default     = "habtamugeta2-r/ReleaseKit"
}

variable "web_origin" {
  description = "HTTPS origin allowed by the API CORS policy."
  type        = string

  validation {
    condition     = can(regex("^https://[^/]+$", var.web_origin))
    error_message = "web_origin must be an HTTPS origin without a path."
  }
}

variable "certificate_arn" {
  description = "ACM certificate ARN covering the web and API hostnames."
  type        = string

  validation {
    condition     = can(regex("^arn:aws[a-z-]*:acm:", var.certificate_arn))
    error_message = "A valid ACM certificate ARN is required for HTTPS."
  }
}

variable "asset_token_secret_arn" {
  description = "Secrets Manager ARN containing a JSON key named token for the asset API bearer token."
  type        = string

  validation {
    condition     = can(regex("^arn:aws[a-z-]*:secretsmanager:", var.asset_token_secret_arn))
    error_message = "asset_token_secret_arn must identify a Secrets Manager secret."
  }
}

variable "vpc_cidr" {
  description = "IPv4 CIDR for the application VPC."
  type        = string
  default     = "10.40.0.0/16"
}

variable "db_instance_class" {
  description = "RDS PostgreSQL instance size; review capacity and cost before apply."
  type        = string
  default     = "db.t4g.micro"
}

variable "db_backup_retention_days" {
  description = "Automated RDS backup retention."
  type        = number
  default     = 7

  validation {
    condition     = var.db_backup_retention_days >= 1 && var.db_backup_retention_days <= 35
    error_message = "RDS backup retention must be between 1 and 35 days."
  }
}

variable "bootstrap_image_tag" {
  description = "Initial task-definition tag. Services start at zero tasks until a verified image is deployed."
  type        = string
  default     = "bootstrap"
}

variable "alarm_topic_arn" {
  description = "Optional SNS topic ARN for CloudWatch alarm notifications."
  type        = string
  default     = ""
}

variable "max_upload_bytes" {
  description = "Maximum upload accepted by the API."
  type        = number
  default     = 5242880
}
