#!/bin/bash
# bootstrap.sh — Run ONCE before your first `terraform init`
# Creates the S3 bucket and DynamoDB table for remote Terraform state.
#
# Usage: AWS_PROFILE=your-profile bash infra/bootstrap.sh

set -e

REGION="ap-southeast-1"
STATE_BUCKET="content-engine-tfstate"
LOCK_TABLE="content-engine-tflock"

echo "🪣 Creating Terraform state S3 bucket: $STATE_BUCKET"
aws s3api create-bucket \
  --bucket "$STATE_BUCKET" \
  --region "$REGION" \
  --create-bucket-configuration LocationConstraint="$REGION"

echo "🔒 Enabling versioning on state bucket..."
aws s3api put-bucket-versioning \
  --bucket "$STATE_BUCKET" \
  --versioning-configuration Status=Enabled

echo "🔐 Enabling encryption on state bucket..."
aws s3api put-bucket-encryption \
  --bucket "$STATE_BUCKET" \
  --server-side-encryption-configuration '{
    "Rules": [{"ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "AES256"}}]
  }'

echo "🗄️  Creating DynamoDB lock table: $LOCK_TABLE"
aws dynamodb create-table \
  --table-name "$LOCK_TABLE" \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region "$REGION"

echo ""
echo "✅ Bootstrap complete! You can now run:"
echo "   cd infra/environments/prod"
echo "   cp ../../terraform.tfvars.example terraform.tfvars"
echo "   # Fill in your secrets in terraform.tfvars"
echo "   terraform init"
echo "   terraform plan"
echo "   terraform apply"
