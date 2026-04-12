terraform {
  required_version = ">= 1.6"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "content-engine-tfstate"
    key            = "prod/terraform.tfstate"
    region         = "ap-southeast-1"
    dynamodb_table = "content-engine-tflock"
    encrypt        = true
    profile        = "content-repurposing-engine"
  }
}

provider "aws" {
  region  = var.aws_region
  profile = "content-repurposing-engine"
}

# CloudFront ACM cert MUST be in us-east-1
provider "aws" {
  alias   = "us_east_1"
  region  = "us-east-1"
  profile = "content-repurposing-engine"
}
