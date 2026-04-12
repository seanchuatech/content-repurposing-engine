terraform {
  required_providers {
    aws = {
      source                = "hashicorp/aws"
      version               = ">= 5.0"
      configuration_aliases = [aws.us_east_1]
    }
  }
}

locals {
  name        = "${var.project_name}-${var.environment}"
  full_domain = "${var.subdomain}.${var.domain_name}"
}

# ─── ACM Certificate (ap-southeast-1) — for ALB ───────────────────────────────
resource "aws_acm_certificate" "alb" {
  domain_name       = local.full_domain
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = { Name = "${local.name}-cert-alb" }
}

# ─── ACM Certificate (us-east-1) — for CloudFront ─────────────────────────────
resource "aws_acm_certificate" "cloudfront" {
  provider          = aws.us_east_1
  domain_name       = local.full_domain
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = { Name = "${local.name}-cert-cf" }
}

# Output the CNAME records so you can add them in Porkbun
output "acm_validation_records" {
  description = "Add these CNAME records in Porkbun to validate your ACM certificates"
  value = {
    for dvo in aws_acm_certificate.cloudfront.domain_validation_options : dvo.domain_name => {
      name  = dvo.resource_record_name
      type  = dvo.resource_record_type
      value = dvo.resource_record_value
    }
  }
}

# ─── CloudFront Distribution ──────────────────────────────────────────────────
resource "aws_cloudfront_distribution" "main" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "${local.name} distribution"
  default_root_object = "index.html"
  aliases             = [local.full_domain]

  # ── Origin 1: SPA (S3) ────────────────────────────────────────────────────
  origin {
    domain_name              = var.spa_bucket_regional_domain
    origin_id                = "spa-s3"
    origin_access_control_id = var.spa_oac_id
  }

  # ── Origin 2: API (ALB) ───────────────────────────────────────────────────
  origin {
    domain_name = var.alb_dns_name
    origin_id   = "api-alb"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # ── Origin 3: Media (S3) ──────────────────────────────────────────────────
  origin {
    domain_name              = var.media_bucket_regional_domain
    origin_id                = "media-s3"
    origin_access_control_id = var.media_oac_id
  }

  # ── Behavior: /api/* → ALB (no cache) ────────────────────────────────────
  ordered_cache_behavior {
    path_pattern           = "/api/*"
    target_origin_id       = "api-alb"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    # Pass all headers, cookies, and query strings to the API
    forwarded_values {
      query_string = true
      headers      = ["Authorization", "Content-Type", "Origin"]
      cookies {
        forward = "all"
      }
    }

    min_ttl     = 0
    default_ttl = 0
    max_ttl     = 0
  }

  # ── Behavior: /healthz, /readyz → ALB (no cache) ─────────────────────────
  ordered_cache_behavior {
    path_pattern           = "/healthz"
    target_origin_id       = "api-alb"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]

    forwarded_values {
      query_string = false
      cookies { forward = "none" }
    }
    min_ttl     = 0
    default_ttl = 0
    max_ttl     = 0
  }

  # ── Behavior: /storage/* → S3 Media (cached) ─────────────────────────────
  ordered_cache_behavior {
    path_pattern           = "/storage/*"
    target_origin_id       = "media-s3"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    forwarded_values {
      query_string = false
      cookies { forward = "none" }
    }

    min_ttl     = 0
    default_ttl = 86400    # 24 hours
    max_ttl     = 604800   # 7 days
  }

  # ── Default Behavior: /* → SPA (S3) ──────────────────────────────────────
  default_cache_behavior {
    target_origin_id       = "spa-s3"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    forwarded_values {
      query_string = false
      cookies { forward = "none" }
    }

    min_ttl     = 0
    default_ttl = 3600   # 1 hour
    max_ttl     = 86400  # 24 hours
  }

  # ── Custom Error: SPA routing (React Router fallback) ────────────────────
  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }

  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.cloudfront.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = { Name = "${local.name}-cf" }
}
