variable "project_name" { type = string }
variable "environment" { type = string }
variable "domain_name" { type = string }
variable "subdomain" { type = string }

variable "cloudfront_distribution_arn" {
  description = "CloudFront distribution ARN (for S3 bucket policy). Pass a placeholder on first apply."
  type        = string
  default     = "*"
}
