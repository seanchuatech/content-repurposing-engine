variable "project_name" { type = string }
variable "environment" { type = string }

variable "subnet_ids" {
  description = "Private/data subnet IDs for the RDS instance"
  type        = list(string)
}

variable "security_group_id" {
  description = "Security group ID to attach to RDS"
  type        = string
}

variable "db_password" {
  description = "RDS master password"
  type        = string
  sensitive   = true
}
