output "spa_bucket_name" {
  value = aws_s3_bucket.spa.id
}

output "spa_bucket_arn" {
  value = aws_s3_bucket.spa.arn
}

output "spa_bucket_regional_domain" {
  value = aws_s3_bucket.spa.bucket_regional_domain_name
}

output "spa_oac_id" {
  value = aws_cloudfront_origin_access_control.spa.id
}

output "media_bucket_name" {
  value = aws_s3_bucket.media.id
}

output "media_bucket_arn" {
  value = aws_s3_bucket.media.arn
}

output "media_bucket_regional_domain" {
  value = aws_s3_bucket.media.bucket_regional_domain_name
}

output "media_oac_id" {
  value = aws_cloudfront_origin_access_control.media.id
}
