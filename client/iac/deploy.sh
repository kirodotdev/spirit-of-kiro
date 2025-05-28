#!/bin/bash
set -e

# Configuration
STACK_NAME="web-app"
REGION="us-east-1"  # CloudFront requires us-east-1 for Lambda@Edge

# Prompt for WebSocket server address if not provided
if [ -z "$1" ]; then
  read -p "Enter WebSocket server address (hostname:port): " WS_ENDPOINT
else
  WS_ENDPOINT=$1
fi

# Validate WebSocket endpoint format
if ! [[ $WS_ENDPOINT =~ ^[^:]+:[0-9]+$ ]]; then
  echo "Error: WebSocket endpoint must be in format hostname:port"
  exit 1
fi

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
  --region $REGION \
  --parameter-overrides WebSocketEndpoint=$WS_ENDPOINT

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

# Invalidate CloudFront cache
DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --query 'Stacks[0].Outputs[?OutputKey==`DistributionDomainName`].OutputValue' \
  --output text \
  --region $REGION | xargs -I {} aws cloudfront list-distributions --query "DistributionList.Items[?DomainName=='{}'].Id" --output text)

if [ -n "$DISTRIBUTION_ID" ]; then
  echo "Invalidating CloudFront cache for distribution: $DISTRIBUTION_ID"
  aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths '/*' --region $REGION --output text
else
  echo "Warning: Could not determine CloudFront distribution ID for cache invalidation."
fi

echo "Deployment complete!"
echo "Your application is available at: https://$DISTRIBUTION_DOMAIN"
echo "WebSocket server configured at: $WS_ENDPOINT"
echo "Username: tester"
echo "Password: spooky" 