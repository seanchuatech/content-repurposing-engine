output "ecs_cluster_arn" {
  value = aws_ecs_cluster.main.arn
}

output "worker_task_def_arn" {
  value = aws_ecs_task_definition.worker.arn
}

output "alb_dns_name" {
  value = aws_lb.main.dns_name
}

output "alb_zone_id" {
  value = aws_lb.main.zone_id
}

output "api_task_role_arn" {
  value = aws_iam_role.api_task.arn
}

output "worker_task_role_arn" {
  value = aws_iam_role.worker_task.arn
}

output "execution_role_arn" {
  value = aws_iam_role.execution.arn
}

output "alb_arn_suffix" {
  value = aws_lb.main.arn_suffix
}

output "target_group_arn_suffix" {
  value = aws_lb_target_group.api.arn_suffix
}
