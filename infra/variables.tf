variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "ap-southeast-1"
}

variable "project_name" {
  description = "Project name used as a prefix for all resource names"
  type        = string
  default     = "content-engine"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "prod"
}

variable "domain_name" {
  description = "Root domain (e.g. leonardseanchua.dev)"
  type        = string
}

variable "subdomain" {
  description = "Subdomain for this app (e.g. studio)"
  type        = string
  default     = "studio"
}

# Secrets — sensitive, sourced from terraform.tfvars (gitignored)
variable "jwt_secret" {
  description = "JWT signing secret"
  type        = string
  sensitive   = true
}

variable "db_password" {
  description = "RDS master password"
  type        = string
  sensitive   = true
}

variable "stripe_secret_key" {
  description = "Stripe secret key"
  type        = string
  sensitive   = true
}

variable "stripe_webhook_secret" {
  description = "Stripe webhook signing secret"
  type        = string
  sensitive   = true
}

variable "stripe_price_id" {
  description = "Stripe Price ID for the subscription plan"
  type        = string
  sensitive   = true
}

variable "groq_api_key" {
  description = "Groq Cloud API key"
  type        = string
  sensitive   = true
}

variable "gemini_api_key" {
  description = "Google Gemini API key"
  type        = string
  sensitive   = true
}

variable "google_client_id" {
  description = "Google OAuth client ID"
  type        = string
  sensitive   = true
}

variable "google_client_secret" {
  description = "Google OAuth client secret"
  type        = string
  sensitive   = true
}

variable "github_repo" {
  description = "GitHub repo in org/repo format for OIDC trust"
  type        = string
  default     = "seanchuatech/content-repurposing-engine"
}

# ECS image config — updated by CI/CD on each deploy
variable "api_image_tag" {
  description = "Docker image tag for the API container"
  type        = string
  default     = "latest"
}

variable "worker_image_tag" {
  description = "Docker image tag for the Worker container"
  type        = string
  default     = "latest"
}
