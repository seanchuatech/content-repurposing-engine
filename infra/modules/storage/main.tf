locals {
  name        = "${var.project_name}-${var.environment}"
  full_domain = "${var.subdomain}.${var.domain_name}"
}

# ─── SPA Bucket ───────────────────────────────────────────────────────────────
resource "aws_s3_bucket" "spa" {
  bucket = "${local.name}-spa"
  tags   = { Name = "${local.name}-spa" }
}

resource "aws_s3_bucket_public_access_block" "spa" {
  bucket                  = aws_s3_bucket.spa.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# CloudFront Origin Access Control for SPA bucket
resource "aws_cloudfront_origin_access_control" "spa" {
  name                              = "${local.name}-spa-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_s3_bucket_policy" "spa" {
  bucket = aws_s3_bucket.spa.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "cloudfront.amazonaws.com" }
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.spa.arn}/*"
      Condition = {
        StringEquals = {
          "AWS:SourceArn" = var.cloudfront_distribution_arn
        }
      }
    }]
  })
}

# ─── Media Bucket ─────────────────────────────────────────────────────────────
resource "aws_s3_bucket" "media" {
  bucket = "${local.name}-media"
  tags   = { Name = "${local.name}-media" }
}

resource "aws_s3_bucket_public_access_block" "media" {
  bucket                  = aws_s3_bucket.media.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_cloudfront_origin_access_control" "media" {
  name                              = "${local.name}-media-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_s3_bucket_policy" "media" {
  bucket = aws_s3_bucket.media.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "cloudfront.amazonaws.com" }
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.media.arn}/*"
      Condition = {
        StringEquals = {
          "AWS:SourceArn" = var.cloudfront_distribution_arn
        }
      }
    }]
  })
}

# Lifecycle rule: auto-delete temp files older than 7 days
resource "aws_s3_bucket_lifecycle_configuration" "media" {
  bucket = aws_s3_bucket.media.id

  rule {
    id     = "expire-temp"
    status = "Enabled"

    filter {
      prefix = "storage/temp/"
    }

    expiration {
      days = 7
    }
  }
}

# ─── Terraform State Bucket (bootstrapped separately before first apply) ──────
# NOTE: This tfstate bucket must be created manually ONCE via CLI before the
# first `terraform init` with the S3 backend. See README.
