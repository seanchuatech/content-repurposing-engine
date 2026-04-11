locals {
  full_domain = "${var.subdomain}.${var.domain_name}"
  name        = "${var.project_name}-${var.environment}"
}

module "networking" {
  source       = "../../modules/networking"
  project_name = var.project_name
  environment  = var.environment
}

module "cicd" {
  source       = "../../modules/cicd"
  project_name = var.project_name
  environment  = var.environment

  github_repo       = var.github_repo
  spa_bucket_arn    = module.storage.spa_bucket_arn
  execution_role_arn = module.compute.api_task_role_arn # placeholder — corrected below
}

module "database" {
  source       = "../../modules/database"
  project_name = var.project_name
  environment  = var.environment

  subnet_ids        = module.networking.data_subnet_ids
  security_group_id = module.networking.sg_rds_id
  db_password       = var.db_password
}

# CDN is created first (without the CF ARN) to get the CloudFront ARN for S3 policies.
# On first apply, the S3 bucket policies will use "*" as a placeholder.
# On second apply, the real ARN will be used. This is a known Terraform chicken-and-egg pattern.
module "storage" {
  source       = "../../modules/storage"
  project_name = var.project_name
  environment  = var.environment

  domain_name = var.domain_name
  subdomain   = var.subdomain

  # Wire the real CF ARN after first apply
  cloudfront_distribution_arn = module.cdn.cloudfront_distribution_arn
}

module "cdn" {
  source       = "../../modules/cdn"
  project_name = var.project_name
  environment  = var.environment

  domain_name = var.domain_name
  subdomain   = var.subdomain

  spa_bucket_regional_domain   = module.storage.spa_bucket_regional_domain
  spa_oac_id                   = module.storage.spa_oac_id
  media_bucket_regional_domain = module.storage.media_bucket_regional_domain
  media_oac_id                 = module.storage.media_oac_id
  alb_dns_name                 = module.compute.alb_dns_name

  providers = {
    aws           = aws
    aws.us_east_1 = aws.us_east_1
  }
}

module "secrets" {
  source       = "../../modules/secrets"
  project_name = var.project_name
  environment  = var.environment

  jwt_secret            = var.jwt_secret
  database_url          = module.database.database_url
  stripe_secret_key     = var.stripe_secret_key
  stripe_webhook_secret = var.stripe_webhook_secret
  stripe_price_id       = var.stripe_price_id
  groq_api_key          = var.groq_api_key
  gemini_api_key        = var.gemini_api_key
  google_client_id      = var.google_client_id
  google_client_secret  = var.google_client_secret
}

module "compute" {
  source       = "../../modules/compute"
  project_name = var.project_name
  environment  = var.environment

  vpc_id             = module.networking.vpc_id
  public_subnet_ids  = module.networking.public_subnet_ids
  sg_alb_id          = module.networking.sg_alb_id
  sg_api_id          = module.networking.sg_api_id
  sg_worker_id       = module.networking.sg_worker_id

  acm_certificate_arn = module.cdn.alb_acm_certificate_arn

  api_ecr_url    = module.cicd.api_ecr_url
  worker_ecr_url = module.cicd.worker_ecr_url
  api_image_tag    = var.api_image_tag
  worker_image_tag = var.worker_image_tag

  media_bucket_arn  = module.storage.media_bucket_arn
  media_bucket_name = module.storage.media_bucket_name
  spa_bucket_arn    = module.storage.spa_bucket_arn

  ssm_prefix  = module.secrets.ssm_prefix
  full_domain = local.full_domain
}
