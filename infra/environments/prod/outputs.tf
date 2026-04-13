output "app_url" {
  value = "https://${var.subdomain}.${var.domain_name}"
}

output "cloudfront_domain" {
  description = "Add this as a CNAME for studio.leonardseanchua.dev in Porkbun"
  value       = module.cdn.cloudfront_domain
}

output "github_deploy_role_arn" {
  description = "Set this as AWS_ROLE_ARN in your GitHub Actions workflow"
  value       = module.cicd.github_deploy_role_arn
}

output "api_ecr_repository_url" {
  value = module.cicd.api_ecr_url
}

output "worker_ecr_repository_url" {
  value = module.cicd.worker_ecr_url
}

output "rds_endpoint" {
  value     = module.database.endpoint
  sensitive = true
}

output "s3_spa_bucket" {
  value = module.storage.spa_bucket_name
}

output "s3_media_bucket" {
  value = module.storage.media_bucket_name
}

output "cloudfront_distribution_id" {
  value = module.cdn.cloudfront_distribution_id
}
