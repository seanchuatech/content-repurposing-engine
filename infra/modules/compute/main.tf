locals {
  name = "${var.project_name}-${var.environment}"
}

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# ─── ECS Cluster ──────────────────────────────────────────────────────────────
resource "aws_ecs_cluster" "main" {
  name = "${local.name}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = { Name = "${local.name}-cluster" }
}

# ─── CloudWatch Log Groups ────────────────────────────────────────────────────
resource "aws_cloudwatch_log_group" "api" {
  name              = "/ecs/${local.name}-api"
  retention_in_days = 14
}

resource "aws_cloudwatch_log_group" "worker" {
  name              = "/ecs/${local.name}-worker"
  retention_in_days = 7 # Workers are ephemeral; keep logs shorter
}

# ─── IAM: API Task Role (can call ecs:RunTask to launch workers) ──────────────
resource "aws_iam_role" "api_task" {
  name = "${local.name}-api-task-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "api_task" {
  name = "${local.name}-api-task-policy"
  role = aws_iam_role.api_task.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # Read secrets from SSM
      {
        Effect   = "Allow"
        Action   = ["ssm:GetParameter", "ssm:GetParameters", "ssm:GetParametersByPath"]
        Resource = "arn:aws:ssm:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:parameter/${local.name}/*"
      },
      # Read/write media S3 bucket
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
        Resource = "${var.media_bucket_arn}/*"
      },
      # Write SPA to S3 (CI/CD also does this, but useful for migrations)
      {
        Effect   = "Allow"
        Action   = ["s3:PutObject", "s3:DeleteObject"]
        Resource = "${var.spa_bucket_arn}/*"
      },
      # Launch ephemeral worker tasks
      {
        Effect   = "Allow"
        Action   = ["ecs:RunTask"]
        Resource = "arn:aws:ecs:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:task-definition/${local.name}-worker*"
      },
      # Required for ecs:RunTask to pass the worker task role
      {
        Effect   = "Allow"
        Action   = "iam:PassRole"
        Resource = aws_iam_role.worker_task.arn
      },
      # Required for ecs:RunTask to pass the execution role
      {
        Effect   = "Allow"
        Action   = "iam:PassRole"
        Resource = aws_iam_role.execution.arn
      },
    ]
  })
}

# ─── IAM: Worker Task Role ────────────────────────────────────────────────────
resource "aws_iam_role" "worker_task" {
  name = "${local.name}-worker-task-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "worker_task" {
  name = "${local.name}-worker-task-policy"
  role = aws_iam_role.worker_task.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # Read/write media S3
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:PutObject"]
        Resource = "${var.media_bucket_arn}/*"
      },
      # Read secrets from SSM
      {
        Effect   = "Allow"
        Action   = ["ssm:GetParameter", "ssm:GetParameters", "ssm:GetParametersByPath"]
        Resource = "arn:aws:ssm:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:parameter/${local.name}/*"
      },
    ]
  })
}

# ─── IAM: ECS Execution Role (shared — pull images, write logs) ───────────────
resource "aws_iam_role" "execution" {
  name = "${local.name}-ecs-execution-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "execution" {
  role       = aws_iam_role.execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role_policy" "execution_ssm" {
  name = "${local.name}-execution-ssm"
  role = aws_iam_role.execution.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["ssm:GetParameter", "ssm:GetParameters"]
      Resource = "arn:aws:ssm:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:parameter/${local.name}/*"
    }]
  })
}

# ─── ALB ──────────────────────────────────────────────────────────────────────
resource "aws_lb" "main" {
  name               = "${local.name}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [var.sg_alb_id]
  subnets            = var.public_subnet_ids

  tags = { Name = "${local.name}-alb" }
}

resource "aws_lb_target_group" "api" {
  name        = "${local.name}-api-tg"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    path                = "/healthz"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
    matcher             = "200"
  }

  tags = { Name = "${local.name}-api-tg" }
}

# Redirect HTTP → HTTPS
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.acm_certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }
}

# ─── API Task Definition ──────────────────────────────────────────────────────
resource "aws_ecs_task_definition" "api" {
  family                   = "${local.name}-api"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 256  # 0.25 vCPU
  memory                   = 512  # 0.5 GB
  execution_role_arn       = aws_iam_role.execution.arn
  task_role_arn            = aws_iam_role.api_task.arn

  container_definitions = jsonencode([{
    name      = "api"
    image     = "${var.api_ecr_url}:${var.api_image_tag}"
    essential = true

    portMappings = [{
      containerPort = 3000
      protocol      = "tcp"
    }]

    environment = [
      { name = "NODE_ENV",         value = "production" },
      { name = "PORT",             value = "3000" },
      { name = "STORAGE_BACKEND",  value = "s3" },
      { name = "AWS_REGION",       value = data.aws_region.current.name },
      { name = "S3_MEDIA_BUCKET",  value = var.media_bucket_name },
      { name = "ECS_CLUSTER_ARN",  value = aws_ecs_cluster.main.arn },
      { name = "WORKER_TASK_DEF_ARN", value = aws_ecs_task_definition.worker.arn },
      { name = "ECS_SUBNETS",      value = join(",", var.public_subnet_ids) },
      { name = "ECS_SECURITY_GROUPS", value = var.sg_worker_id },
    ]

    # Secrets pulled securely from SSM at task startup
    secrets = [
      { name = "DATABASE_URL",          valueFrom = "${var.ssm_prefix}/database_url" },
      { name = "JWT_SECRET",            valueFrom = "${var.ssm_prefix}/jwt_secret" },
      { name = "STRIPE_SECRET_KEY",     valueFrom = "${var.ssm_prefix}/stripe_secret_key" },
      { name = "STRIPE_WEBHOOK_SECRET", valueFrom = "${var.ssm_prefix}/stripe_webhook_secret" },
      { name = "STRIPE_PRICE_ID",       valueFrom = "${var.ssm_prefix}/stripe_price_id" },
      { name = "GOOGLE_CLIENT_ID",      valueFrom = "${var.ssm_prefix}/google_client_id" },
      { name = "GOOGLE_CLIENT_SECRET",  valueFrom = "${var.ssm_prefix}/google_client_secret" },
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.api.name
        "awslogs-region"        = data.aws_region.current.name
        "awslogs-stream-prefix" = "api"
      }
    }
  }])
}

# ─── API ECS Service (always-on) ─────────────────────────────────────────────
resource "aws_ecs_service" "api" {
  name            = "${local.name}-api"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.public_subnet_ids
    security_groups  = [var.sg_api_id]
    assign_public_ip = true # Required without NAT Gateway
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = "api"
    container_port   = 3000
  }

  deployment_minimum_healthy_percent = 100
  deployment_maximum_percent         = 200

  # Allow CI/CD to update the service without Terraform conflicts
  lifecycle {
    ignore_changes = [task_definition]
  }

  depends_on = [aws_lb_listener.https]
}

# ─── Worker Task Definition (no ECS service — launched on-demand) ─────────────
resource "aws_ecs_task_definition" "worker" {
  family                   = "${local.name}-worker"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 512  # 0.5 vCPU
  memory                   = 1024 # 1 GB
  execution_role_arn       = aws_iam_role.execution.arn
  task_role_arn            = aws_iam_role.worker_task.arn

  container_definitions = jsonencode([{
    name      = "worker"
    image     = "${var.worker_ecr_url}:${var.worker_image_tag}"
    essential = true

    environment = [
      { name = "STORAGE_BACKEND", value = "s3" },
      { name = "AWS_REGION",      value = data.aws_region.current.name },
      { name = "S3_MEDIA_BUCKET", value = var.media_bucket_name },
      { name = "SERVER_URL",      value = "https://${var.full_domain}/api" },
      # JOB_MODE and JOB_PAYLOAD injected per-invocation via container overrides
    ]

    secrets = [
      { name = "DATABASE_URL",   valueFrom = "${var.ssm_prefix}/database_url" },
      { name = "JWT_SECRET",     valueFrom = "${var.ssm_prefix}/jwt_secret" },
      { name = "GROQ_API_KEY",   valueFrom = "${var.ssm_prefix}/groq_api_key" },
      { name = "GEMINI_API_KEY", valueFrom = "${var.ssm_prefix}/gemini_api_key" },
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.worker.name
        "awslogs-region"        = data.aws_region.current.name
        "awslogs-stream-prefix" = "worker"
      }
    }
  }])
}
