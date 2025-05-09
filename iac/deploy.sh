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

echo "Deploying CloudFormation stacks with prefix: $STACK_PREFIX"

# Deploy the S3 bucket stack first
echo "Deploying S3 bucket stack: $S3_STACK_NAME"
aws cloudformation deploy \
  --template-file /app/images-s3.yml \
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
  --template-file /app/distribution.yml \
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

# Create .env file with S3 bucket name and CloudFront domain
echo "Creating .env file with deployment information"
echo "S3_BUCKET_NAME=$IMAGES_BUCKET_NAME" > /shared/.env
echo "CLOUDFRONT_DOMAIN=$DISTRIBUTION_DOMAIN" >> /shared/.env
echo "Environment file created at /shared/.env"