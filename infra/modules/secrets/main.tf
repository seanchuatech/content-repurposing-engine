locals {
  name   = "${var.project_name}-${var.environment}"
  prefix = "/${local.name}"
}

# All secrets stored as SecureString parameters. Values set from tfvars.
resource "aws_ssm_parameter" "jwt_secret" {
  name  = "${local.prefix}/jwt_secret"
  type  = "SecureString"
  value = var.jwt_secret
  tags  = { Name = "${local.name}-jwt-secret" }
}

resource "aws_ssm_parameter" "database_url" {
  name  = "${local.prefix}/database_url"
  type  = "SecureString"
  value = var.database_url
  tags  = { Name = "${local.name}-database-url" }
}

resource "aws_ssm_parameter" "stripe_secret_key" {
  name  = "${local.prefix}/stripe_secret_key"
  type  = "SecureString"
  value = var.stripe_secret_key
  tags  = { Name = "${local.name}-stripe-secret" }
}

resource "aws_ssm_parameter" "stripe_webhook_secret" {
  name  = "${local.prefix}/stripe_webhook_secret"
  type  = "SecureString"
  value = var.stripe_webhook_secret
  tags  = { Name = "${local.name}-stripe-webhook" }
}

resource "aws_ssm_parameter" "stripe_price_id" {
  name  = "${local.prefix}/stripe_price_id"
  type  = "SecureString"
  value = var.stripe_price_id
  tags  = { Name = "${local.name}-stripe-price" }
}

resource "aws_ssm_parameter" "groq_api_key" {
  name  = "${local.prefix}/groq_api_key"
  type  = "SecureString"
  value = var.groq_api_key
  tags  = { Name = "${local.name}-groq-key" }
}

resource "aws_ssm_parameter" "gemini_api_key" {
  name  = "${local.prefix}/gemini_api_key"
  type  = "SecureString"
  value = var.gemini_api_key
  tags  = { Name = "${local.name}-gemini-key" }
}

resource "aws_ssm_parameter" "google_client_id" {
  name  = "${local.prefix}/google_client_id"
  type  = "SecureString"
  value = var.google_client_id
  tags  = { Name = "${local.name}-google-client-id" }
}

resource "aws_ssm_parameter" "google_client_secret" {
  name  = "${local.prefix}/google_client_secret"
  type  = "SecureString"
  value = var.google_client_secret
  tags  = { Name = "${local.name}-google-client-secret" }
}

resource "aws_ssm_parameter" "allowed_demo_emails" {
  name  = "${local.prefix}/allowed_demo_emails"
  type  = "SecureString"
  value = var.allowed_demo_emails
  tags  = { Name = "${local.name}-allowed-demo-emails" }
}
