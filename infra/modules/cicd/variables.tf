variable "project_name" { type = string }
variable "environment" { type = string }

variable "github_repo" {
  description = "GitHub repo in org/repo format, e.g. seanchuatech/content-repurposing-engine"
  type        = string
}

variable "spa_bucket_arn"    { type = string }
variable "pass_role_arns" {
  type        = list(string)
  description = "ARNs of roles that the GitHub deployer is allowed to pass to ECS"
}
