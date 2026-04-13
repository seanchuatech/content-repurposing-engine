output "endpoint" {
  description = "RDS connection endpoint"
  value       = aws_db_instance.postgres.endpoint
  sensitive   = true
}

output "database_url" {
  description = "Full PostgreSQL connection string"
  value       = "postgresql://postgres:${var.db_password}@${aws_db_instance.postgres.endpoint}/content_engine"
  sensitive   = true
}
