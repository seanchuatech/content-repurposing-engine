output "api_ecr_url" {
  value = aws_ecr_repository.api.repository_url
}

output "worker_ecr_url" {
  value = aws_ecr_repository.worker.repository_url
}

output "github_deploy_role_arn" {
  value = aws_iam_role.github_deploy.arn
}
