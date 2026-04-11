variable "project_name" { type = string }
variable "environment" { type = string }
variable "domain_name" { type = string }
variable "subdomain"   { type = string }

variable "spa_bucket_regional_domain"   { type = string }
variable "spa_oac_id"                   { type = string }
variable "media_bucket_regional_domain" { type = string }
variable "media_oac_id"                 { type = string }
variable "alb_dns_name"                 { type = string }

provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}
