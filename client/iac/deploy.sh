#!/bin/bash
set -e

# Configuration
STACK_NAME="web-app"
REGION="us-east-1"  # CloudFront requires us-east-1 for Lambda@Edge

# Build the client application
echo "Building client application..."
cd ..
bun run build

# Deploy CloudFormation stack
echo "Deploying CloudFormation stack..."
aws cloudformation deploy \
  --template-file iac/web.yaml \
  --stack-name $STACK_NAME \
  --capabilities CAPABILITY_IAM \
  --region $REGION

# Get the S3 bucket name from CloudFormation outputs
BUCKET_NAME=$(aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --query 'Stacks[0].Outputs[?OutputKey==`WebsiteBucketName`].OutputValue' \
  --output text \
  --region $REGION)

# Upload the built files to S3
echo "Uploading files to S3 bucket: $BUCKET_NAME"
aws s3 sync dist/ s3://$BUCKET_NAME/ \
  --delete \
  --region $REGION

# Get the CloudFront distribution domain name
DISTRIBUTION_DOMAIN=$(aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --query 'Stacks[0].Outputs[?OutputKey==`DistributionDomainName`].OutputValue' \
  --output text \
  --region $REGION)

echo "Deployment complete!"
echo "Your application is available at: https://$DISTRIBUTION_DOMAIN"
echo "Username: tester"
echo "Password: spooky" 