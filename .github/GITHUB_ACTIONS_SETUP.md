# GitHub Actions Setup Guide

This doc explains exactly which secrets and variables to add to your GitHub repository after running `terraform apply`.

## Step 1: Get Values from Terraform Outputs

After a successful `terraform apply`, run:

```bash
cd infra/environments/prod
terraform output github_deploy_role_arn    # → AWS_ROLE_ARN
terraform output api_ecr_repository_url   # → API_ECR_REPOSITORY
terraform output worker_ecr_repository_url # → WORKER_ECR_REPOSITORY
terraform output cloudfront_distribution_id # → CLOUDFRONT_DISTRIBUTION_ID
terraform output s3_spa_bucket             # → S3_SPA_BUCKET (already in workflow env)
```

## Step 2: Add Secrets to GitHub

Go to: **GitHub Repo → Settings → Secrets and variables → Actions → Secrets**

Add the following **Secrets** (sensitive — encrypted):

| Secret Name | Value | Where to get it |
|---|---|---|
| `AWS_ROLE_ARN` | `arn:aws:iam::123456789:role/content-engine-prod-github-deploy-role` | `terraform output github_deploy_role_arn` |
| `API_ECR_REPOSITORY` | `123456789.dkr.ecr.ap-southeast-1.amazonaws.com/content-engine-prod-api` | `terraform output api_ecr_repository_url` |
| `WORKER_ECR_REPOSITORY` | `123456789.dkr.ecr.ap-southeast-1.amazonaws.com/content-engine-prod-worker` | `terraform output worker_ecr_repository_url` |

## Step 3: Add Variables to GitHub

Go to: **GitHub Repo → Settings → Secrets and variables → Actions → Variables**

Add the following **Variables** (non-sensitive — visible in logs):

| Variable Name | Value | Where to get it |
|---|---|---|
| `CLOUDFRONT_DISTRIBUTION_ID` | `E1234ABCDEF...` | AWS Console → CloudFront → Your distribution |

> [!NOTE]
> `CLOUDFRONT_DISTRIBUTION_ID` is used directly in the deploy workflow via `${{ vars.CLOUDFRONT_DISTRIBUTION_ID }}`. It's non-sensitive (a public distribution ID), so it goes in Variables, not Secrets.

## Step 4: Verify OIDC Trust

The `AWS_ROLE_ARN` uses GitHub OIDC — no static AWS credentials needed. The trust policy (configured in Terraform) restricts access to pushes on the `main` branch of `seanchuatech/content-repurposing-engine` only.

This means:
- ✅ Pushes to `main` → deploy role is trusted
- ❌ PRs from forks → deploy role is NOT trusted (intentional)
- ❌ Feature branches → deploy role is NOT trusted (intentional)

## Workflow Overview

```
PR opened/updated
  └── ci.yml runs
        ├── Server: tsc type check
        ├── Client: Vite build check
        ├── Worker: ruff lint + pyright
        └── Docker: image build validation (no push)

Merged to main
  └── ci.yml (lint) + deploy.yml (in parallel)
        ├── build-api    → ECR push
        ├── build-worker → ECR push
        ├── deploy-api   → ECS rolling deploy (waits for stability)
        ├── register-worker → New task def registered (no service update needed)
        ├── deploy-spa   → S3 sync + CloudFront invalidation
        └── summary      → GitHub Job Summary with status table

Daily (midnight UTC)
  └── drift-detection.yml
        └── terraform plan → alerts if AWS state drifted
```
