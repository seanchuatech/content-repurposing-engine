output "cloudfront_domain" {
  description = "CloudFront distribution domain name"
  value       = module.cdn.cloudfront_domain
}

output "app_url" {
  description = "Full application URL"
  value       = "https://${var.subdomain}.${var.domain_name}"
}

output "alb_dns_name" {
  description = "ALB DNS name (for debugging)"
  value       = module.compute.alb_dns_name
}

output "api_ecr_repository_url" {
  description = "ECR repository URL for the API image"
  value       = module.cicd.api_ecr_url
}

output "worker_ecr_repository_url" {
  description = "ECR repository URL for the Worker image"
  value       = module.cicd.worker_ecr_url
}

output "github_deploy_role_arn" {
  description = "IAM Role ARN to configure in GitHub Actions"
  value       = module.cicd.github_deploy_role_arn
}

output "rds_endpoint" {
  description = "RDS PostgreSQL endpoint (internal)"
  value       = module.database.endpoint
  sensitive   = true
}

output "s3_spa_bucket" {
  description = "S3 bucket name for the React SPA"
  value       = module.storage.spa_bucket_name
}

output "s3_media_bucket" {
  description = "S3 bucket name for media files"
  value       = module.storage.media_bucket_name
}
