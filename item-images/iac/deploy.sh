#!/bin/bash
set -e

# Check if stack name prefix is provided
if [ -z "$1" ]; then
  echo "Error: Stack name prefix is required"
  echo "Usage: $0 <stack-name-prefix>"
  exit 1
fi

STACK_PREFIX=$1
S3_STACK_NAME="${STACK_PREFIX}-images-s3"
DISTRIBUTION_STACK_NAME="${STACK_PREFIX}-distribution"
MEMORYDB_STACK_NAME="${STACK_PREFIX}-memorydb"

echo "Deploying CloudFormation stacks with prefix: $STACK_PREFIX"

# Deploy the S3 bucket stack first
echo "Deploying S3 bucket stack: $S3_STACK_NAME"
aws cloudformation deploy \
  --template-file images-s3.yml \
  --stack-name $S3_STACK_NAME \
  --capabilities CAPABILITY_IAM

# Check if deployment was successful
if [ $? -ne 0 ]; then
  echo "Error: Failed to deploy S3 bucket stack"
  exit 1
fi

# Get outputs from the S3 stack
echo "Getting outputs from S3 stack"
IMAGES_BUCKET_NAME=$(aws cloudformation describe-stacks --stack-name $S3_STACK_NAME --query "Stacks[0].Outputs[?OutputKey=='ImagesBucketName'].OutputValue" --output text)
IMAGES_BUCKET_ARN=$(aws cloudformation describe-stacks --stack-name $S3_STACK_NAME --query "Stacks[0].Outputs[?OutputKey=='ImagesBucketArn'].OutputValue" --output text)

if [ -z "$IMAGES_BUCKET_NAME" ] || [ -z "$IMAGES_BUCKET_ARN" ]; then
  echo "Error: Failed to get outputs from S3 stack"
  exit 1
fi

echo "S3 Bucket Name: $IMAGES_BUCKET_NAME"
echo "S3 Bucket ARN: $IMAGES_BUCKET_ARN"

# Deploy the CloudFront distribution stack
echo "Deploying CloudFront distribution stack: $DISTRIBUTION_STACK_NAME"
aws cloudformation deploy \
  --template-file distribution.yml \
  --stack-name $DISTRIBUTION_STACK_NAME \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides \
    ImagesBucketName=$IMAGES_BUCKET_NAME \
    ImagesBucketArn=$IMAGES_BUCKET_ARN

# Check if deployment was successful
if [ $? -ne 0 ]; then
  echo "Error: Failed to deploy CloudFront distribution stack"
  exit 1
fi

# Get outputs from the CloudFront distribution stack
echo "Getting outputs from CloudFront distribution stack"
DISTRIBUTION_ID=$(aws cloudformation describe-stacks --stack-name $DISTRIBUTION_STACK_NAME --query "Stacks[0].Outputs[?OutputKey=='DistributionId'].OutputValue" --output text)
DISTRIBUTION_DOMAIN=$(aws cloudformation describe-stacks --stack-name $DISTRIBUTION_STACK_NAME --query "Stacks[0].Outputs[?OutputKey=='DistributionDomainName'].OutputValue" --output text)

echo "Deployment completed successfully!"
echo "CloudFront Distribution ID: $DISTRIBUTION_ID"
echo "CloudFront Distribution Domain: $DISTRIBUTION_DOMAIN"

# Find default VPC and subnets
echo "Looking up default VPC and subnets"
DEFAULT_VPC_ID=$(aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" --query "Vpcs[0].VpcId" --output text)

if [ -z "$DEFAULT_VPC_ID" ] || [ "$DEFAULT_VPC_ID" == "None" ]; then
  echo "Error: No default VPC found in this account/region"
  exit 1
fi

echo "Found default VPC: $DEFAULT_VPC_ID"

# Get subnet IDs from the default VPC
SUBNET_IDS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$DEFAULT_VPC_ID" --query "Subnets[*].SubnetId" --output text | tr '\t' ',')

if [ -z "$SUBNET_IDS" ] || [ "$SUBNET_IDS" == "None" ]; then
  echo "Error: No subnets found in the default VPC"
  exit 1
fi

echo "Found subnets: $SUBNET_IDS"

# Deploy the MemoryDB cluster stack
echo "Deploying MemoryDB cluster stack: $MEMORYDB_STACK_NAME"
aws cloudformation deploy \
  --template-file memorydb.yml \
  --stack-name $MEMORYDB_STACK_NAME \
  --capabilities CAPABILITY_IAM \
  --disable-rollback \
  --parameter-overrides \
    VpcId=$DEFAULT_VPC_ID \
    SubnetIds=$SUBNET_IDS

# Check if deployment was successful
if [ $? -ne 0 ]; then
  echo "Error: Failed to deploy MemoryDB cluster stack"
  exit 1
fi

# Get outputs from the MemoryDB cluster stack
echo "Getting outputs from MemoryDB cluster stack"
REDIS_ENDPOINT=$(aws cloudformation describe-stacks --stack-name $MEMORYDB_STACK_NAME --query "Stacks[0].Outputs[?OutputKey=='MemoryDBEndpoint'].OutputValue" --output text)
REDIS_PORT=6379

if [ -z "$REDIS_ENDPOINT" ] || [ -z "$REDIS_PORT" ]; then
  echo "Error: Failed to get outputs from MemoryDB cluster stack"
  exit 1
fi

echo "MemoryDB Endpoint: $REDIS_ENDPOINT"
echo "MemoryDB Port: $REDIS_PORT"

# Create .env file with S3 bucket name, CloudFront domain, and Redis information
echo "Creating .env file with deployment information"
echo "S3_BUCKET_NAME=$IMAGES_BUCKET_NAME" > ../prod.env
echo "CLOUDFRONT_DOMAIN=$DISTRIBUTION_DOMAIN" >> ../prod.env
echo "REDIS_HOST=$REDIS_ENDPOINT" >> ../prod.env
echo "REDIS_PORT=$REDIS_PORT" >> ../prod.env
echo "Environment file created at ../prod.env"