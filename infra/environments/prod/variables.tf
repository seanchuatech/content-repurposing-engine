variable "aws_region" {
  type    = string
  default = "ap-southeast-1"
}

variable "project_name" {
  type    = string
  default = "content-engine"
}

variable "environment" {
  type    = string
  default = "prod"
}

variable "domain_name" {
  type = string
}

variable "subdomain" {
  type    = string
  default = "studio"
}

variable "github_repo" {
  type = string
}

variable "jwt_secret" {
  type      = string
  sensitive = true
}

variable "database_url" {
  type      = string
  sensitive = true
  default   = ""
}

variable "db_password" {
  type      = string
  sensitive = true
}

variable "stripe_secret_key" {
  type      = string
  sensitive = true
}

variable "stripe_webhook_secret" {
  type      = string
  sensitive = true
}

variable "stripe_price_id" {
  type      = string
  sensitive = true
}

variable "groq_api_key" {
  type      = string
  sensitive = true
}

variable "gemini_api_key" {
  type      = string
  sensitive = true
}

variable "google_client_id" {
  type      = string
  sensitive = true
}

variable "google_client_secret" {
  type      = string
  sensitive = true
}

variable "api_image_tag" {
  type    = string
  default = "latest"
}

variable "worker_image_tag" {
  type    = string
  default = "latest"
}

variable "allowed_demo_emails" {
  description = "Comma-separated list of emails allowed to use the demo"
  type        = string
}
