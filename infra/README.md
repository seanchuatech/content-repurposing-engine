# Terraform Infrastructure: Content Repurposing Engine

This directory contains the Terraform code to provision the full AWS infrastructure for the Content Repurposing Engine.

## First-Time Setup

### Prerequisites
- [Terraform](https://developer.hashicorp.com/terraform/downloads) >= 1.6
- AWS CLI configured (`aws configure`)

### 1. Bootstrap Remote State (run once)

```bash
bash infra/bootstrap.sh
```

This creates the S3 bucket (`content-engine-tfstate`) and DynamoDB table (`content-engine-tflock`) for remote state management.

### 2. Configure Variables

```bash
cd infra/environments/prod
cp ../../terraform.tfvars.example terraform.tfvars
```

Fill in all secret values in `terraform.tfvars`. **This file is gitignored — never commit it.**

### 3. Deploy

```bash
terraform init
terraform plan   # Review what will be created
terraform apply  # Deploy!
```

### 4. Post-Apply Steps

After the first apply, copy the outputs and perform:

1. **Add CNAME in Porkbun** — Get the CloudFront domain from outputs:
   ```bash
   terraform output cloudfront_domain
   ```
   Create a CNAME record: `studio → <cloudfront-domain>`

2. **Validate ACM Certificates** — Copy the CNAME records from the `acm_validation_records` output and add them to Porkbun. ACM validation can take 5–30 minutes.

3. **Configure GitHub Actions** — Add the deploy role ARN to your GitHub repo:
   ```bash
   terraform output github_deploy_role_arn
   ```
   Save this as `AWS_ROLE_ARN` in your repo's Settings → Secrets & Variables → Actions.

4. **Run DB migrations** — After the first deploy:
   ```bash
   # In the server container or locally with DATABASE_URL set to prod
   bun run db:push
   ```

## Module Overview

| Module | Purpose |
|--------|---------|
| `networking` | VPC, subnets, SGs, VPC endpoints |
| `database` | RDS PostgreSQL (free tier) |
| `storage` | S3 for SPA and media |
| `compute` | ECS cluster, ALB, API service, Worker task def |
| `cdn` | CloudFront + ACM certs |
| `secrets` | SSM Parameter Store |
| `cicd` | GitHub OIDC, ECR repos, deploy IAM role |
