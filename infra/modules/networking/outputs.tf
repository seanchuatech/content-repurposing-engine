output "vpc_id" {
  value = aws_vpc.main.id
}

output "public_subnet_ids" {
  value = aws_subnet.public[*].id
}

output "data_subnet_ids" {
  value = aws_subnet.data[*].id
}

output "sg_alb_id" {
  value = aws_security_group.alb.id
}

output "sg_api_id" {
  value = aws_security_group.api.id
}

output "sg_worker_id" {
  value = aws_security_group.worker.id
}

output "sg_rds_id" {
  value = aws_security_group.rds.id
}
