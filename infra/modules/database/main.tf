locals {
  name = "${var.project_name}-${var.environment}"
}

resource "aws_db_subnet_group" "main" {
  name       = "${local.name}-db-subnet-group"
  subnet_ids = var.subnet_ids
  tags       = { Name = "${local.name}-db-subnet-group" }
}

resource "aws_db_instance" "postgres" {
  identifier = "${local.name}-db"

  # Free tier: db.t3.micro, 20GB gp2, Single-AZ
  engine               = "postgres"
  engine_version       = "16"
  instance_class       = "db.t3.micro"
  allocated_storage    = 20
  storage_type         = "gp2"
  storage_encrypted    = true

  db_name  = "content_engine"
  username = "postgres"
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [var.security_group_id]

  # Free tier = Single-AZ
  multi_az               = false
  publicly_accessible    = false
  skip_final_snapshot    = false
  final_snapshot_identifier = "${local.name}-final-snapshot"

  # Backups
  backup_retention_period = 7
  backup_window           = "03:00-04:00"
  maintenance_window      = "sun:04:00-sun:05:00"

  # Performance Insights free tier
  performance_insights_enabled = true

  tags = { Name = "${local.name}-postgres" }
}
