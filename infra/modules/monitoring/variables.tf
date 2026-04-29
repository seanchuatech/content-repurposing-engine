variable "project_name" {
  type        = string
  description = "Name of the project"
}

variable "environment" {
  type        = string
  description = "Deployment environment"
}

variable "alert_email" {
  type        = string
  description = "Email address to send CloudWatch alerts to"
}

variable "alb_arn_suffix" {
  type        = string
  description = "ARN suffix of the ALB"
}

variable "target_group_arn_suffix" {
  type        = string
  description = "ARN suffix of the ALB Target Group"
}
