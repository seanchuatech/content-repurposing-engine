variable "project_name" { type = string }
variable "environment" { type = string }

variable "github_repo" {
  description = "GitHub repo in org/repo format, e.g. seanchuatech/content-repurposing-engine"
  type        = string
}

variable "spa_bucket_arn"    { type = string }
variable "execution_role_arn" { type = string }
