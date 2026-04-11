variable "project_name" { type = string }
variable "environment" { type = string }

variable "vpc_id"            { type = string }
variable "public_subnet_ids" { type = list(string) }
variable "sg_alb_id"         { type = string }
variable "sg_api_id"         { type = string }
variable "sg_worker_id"      { type = string }

variable "acm_certificate_arn" {
  description = "ACM cert ARN (ap-southeast-1) for ALB HTTPS listener"
  type        = string
}

variable "api_ecr_url"    { type = string }
variable "worker_ecr_url" { type = string }

variable "api_image_tag" {
  type    = string
  default = "latest"
}

variable "worker_image_tag" {
  type    = string
  default = "latest"
}

variable "media_bucket_arn"  { type = string }
variable "media_bucket_name" { type = string }
variable "spa_bucket_arn"    { type = string }

variable "ssm_prefix" {
  description = "SSM parameter path prefix, e.g. /content-engine-prod"
  type        = string
}

variable "full_domain" {
  description = "Full domain for the app, e.g. studio.leonardseanchua.dev"
  type        = string
}
