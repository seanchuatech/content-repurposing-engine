output "api_ecr_url" {
  value = aws_ecr_repository.api.repository_url
}

output "api_ecr_name" {
  value = aws_ecr_repository.api.name
}

output "worker_ecr_url" {
  value = aws_ecr_repository.worker.repository_url
}

output "worker_ecr_name" {
  value = aws_ecr_repository.worker.name
}

output "github_deploy_role_arn" {
  value = aws_iam_role.github_deploy.arn
}
