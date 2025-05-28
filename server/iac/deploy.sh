#!/bin/bash
set -e

# Check if stack name prefix is provided
if [ -z "$1" ]; then
  echo "Error: Stack name prefix is required"
  echo "Usage: $0 <stack-name-prefix>"
  exit 1
fi

STACK_PREFIX=$1
DYNAMODB_STACK_NAME="${STACK_PREFIX}-dynamodb"
FARGATE_STACK_NAME="${STACK_PREFIX}"
ECR_REPOSITORY_NAME="${STACK_PREFIX}"

echo "Deploying CloudFormation stacks with prefix: $STACK_PREFIX"

# Deploy the DynamoDB stack first
echo "Deploying DynamoDB stack: $DYNAMODB_STACK_NAME"
aws cloudformation deploy \
  --template-file dynamodb.yml \
  --stack-name $DYNAMODB_STACK_NAME \
  --capabilities CAPABILITY_IAM

# Check if deployment was successful
if [ $? -ne 0 ]; then
  echo "Error: Failed to deploy DynamoDB stack"
  exit 1
fi

# Get outputs from the DynamoDB stack
echo "Getting outputs from DynamoDB stack"
ITEMS_TABLE_NAME=$(aws cloudformation describe-stacks --stack-name $DYNAMODB_STACK_NAME --query "Stacks[0].Outputs[?OutputKey=='ItemsTableName'].OutputValue" --output text)
ITEMS_TABLE_ARN=$(aws cloudformation describe-stacks --stack-name $DYNAMODB_STACK_NAME --query "Stacks[0].Outputs[?OutputKey=='ItemsTableArn'].OutputValue" --output text)
INVENTORY_TABLE_NAME=$(aws cloudformation describe-stacks --stack-name $DYNAMODB_STACK_NAME --query "Stacks[0].Outputs[?OutputKey=='InventoryTableName'].OutputValue" --output text)
INVENTORY_TABLE_ARN=$(aws cloudformation describe-stacks --stack-name $DYNAMODB_STACK_NAME --query "Stacks[0].Outputs[?OutputKey=='InventoryTableArn'].OutputValue" --output text)
LOCATION_TABLE_NAME=$(aws cloudformation describe-stacks --stack-name $DYNAMODB_STACK_NAME --query "Stacks[0].Outputs[?OutputKey=='LocationTableName'].OutputValue" --output text)
LOCATION_TABLE_ARN=$(aws cloudformation describe-stacks --stack-name $DYNAMODB_STACK_NAME --query "Stacks[0].Outputs[?OutputKey=='LocationTableArn'].OutputValue" --output text)
USERS_TABLE_NAME=$(aws cloudformation describe-stacks --stack-name $DYNAMODB_STACK_NAME --query "Stacks[0].Outputs[?OutputKey=='UsersTableName'].OutputValue" --output text)
USERS_TABLE_ARN=$(aws cloudformation describe-stacks --stack-name $DYNAMODB_STACK_NAME --query "Stacks[0].Outputs[?OutputKey=='UsersTableArn'].OutputValue" --output text)
USERNAMES_TABLE_NAME=$(aws cloudformation describe-stacks --stack-name $DYNAMODB_STACK_NAME --query "Stacks[0].Outputs[?OutputKey=='UsernamesTableName'].OutputValue" --output text)
USERNAMES_TABLE_ARN=$(aws cloudformation describe-stacks --stack-name $DYNAMODB_STACK_NAME --query "Stacks[0].Outputs[?OutputKey=='UsernamesTableArn'].OutputValue" --output text)
PERSONA_TABLE_NAME=$(aws cloudformation describe-stacks --stack-name $DYNAMODB_STACK_NAME --query "Stacks[0].Outputs[?OutputKey=='PersonaTableName'].OutputValue" --output text)
PERSONA_TABLE_ARN=$(aws cloudformation describe-stacks --stack-name $DYNAMODB_STACK_NAME --query "Stacks[0].Outputs[?OutputKey=='PersonaTableArn'].OutputValue" --output text)

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

# Create or ensure the ECR repository exists
echo "Creating ECR repository: $ECR_REPOSITORY_NAME"
aws ecr describe-repositories --repository-names "$ECR_REPOSITORY_NAME" > /dev/null 2>&1 || \
aws ecr create-repository --repository-name "$ECR_REPOSITORY_NAME" > /dev/null

if [ $? -ne 0 ]; then
  echo "Error: Failed to create or verify ECR repository"
  exit 1
fi

# Get the ECR repository URI
ECR_REPOSITORY_URI=$(aws ecr describe-repositories --repository-names "$ECR_REPOSITORY_NAME" --query "repositories[0].repositoryUri" --output text)

if [ -z "$ECR_REPOSITORY_URI" ]; then
  echo "Error: Failed to get ECR repository URI"
  exit 1
fi

echo "ECR Repository URI: $ECR_REPOSITORY_URI"

# Create a timestamp-based tag for the Docker image
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
IMAGE_TAG="${TIMESTAMP}"
echo "Using image tag: $IMAGE_TAG"

# Get ECR login token and login with Podman
echo "Logging in to ECR with Podman"
aws ecr get-login-password | podman login --username AWS --password-stdin "$ECR_REPOSITORY_URI"

if [ $? -ne 0 ]; then
  echo "Error: Failed to login to ECR with Podman"
  exit 1
fi

# Build the Docker image using Podman
echo "Building Docker image with Podman"
cd ..
podman build -t "$ECR_REPOSITORY_NAME" .

if [ $? -ne 0 ]; then
  echo "Error: Failed to build Docker image"
  exit 1
fi

# Tag the image with the ECR repository URI and timestamp
echo "Tagging Docker image with timestamp"
podman tag "$ECR_REPOSITORY_NAME" "$ECR_REPOSITORY_URI:$IMAGE_TAG"
podman tag "$ECR_REPOSITORY_NAME" "$ECR_REPOSITORY_URI:latest"

if [ $? -ne 0 ]; then
  echo "Error: Failed to tag Docker image"
  exit 1
fi

# Push the images to ECR
echo "Pushing Docker images to ECR"
podman push "$ECR_REPOSITORY_URI:$IMAGE_TAG"
podman push "$ECR_REPOSITORY_URI:latest"

if [ $? -ne 0 ]; then
  echo "Error: Failed to push Docker images to ECR"
  exit 1
fi

echo "Successfully pushed Docker images to ECR with tag: $IMAGE_TAG"

# Return to the iac directory
cd iac

# Deploy the Fargate stack
echo "Deploying Fargate stack: $FARGATE_STACK_NAME"

# Get public and private subnet IDs
PUBLIC_SUBNET_IDS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$DEFAULT_VPC_ID" "Name=map-public-ip-on-launch,Values=true" --query "Subnets[*].SubnetId" --output text | tr '\t' ',')
PRIVATE_SUBNET_IDS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$DEFAULT_VPC_ID" "Name=map-public-ip-on-launch,Values=false" --query "Subnets[*].SubnetId" --output text | tr '\t' ',')

# If no private subnets found, use public subnets for both
if [ -z "$PRIVATE_SUBNET_IDS" ] || [ "$PRIVATE_SUBNET_IDS" == "None" ]; then
  echo "No private subnets found, using public subnets for both public and private"
  PRIVATE_SUBNET_IDS=$PUBLIC_SUBNET_IDS
fi

if [ -z "$PUBLIC_SUBNET_IDS" ] || [ "$PUBLIC_SUBNET_IDS" == "None" ]; then
  echo "No public subnets found, using all subnets for both public and private"
  PUBLIC_SUBNET_IDS=$SUBNET_IDS
  PRIVATE_SUBNET_IDS=$SUBNET_IDS
fi

echo "Public subnets: $PUBLIC_SUBNET_IDS"
echo "Private subnets: $PRIVATE_SUBNET_IDS"

# Deploy the Fargate stack
aws cloudformation deploy \
  --template-file fargate.yml \
  --stack-name $FARGATE_STACK_NAME \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides \
    Environment="prod" \
    CpuArchitecture="ARM64" \
    ContainerImageUrl="$ECR_REPOSITORY_URI:$IMAGE_TAG" \
    VpcId=$DEFAULT_VPC_ID \
    PrivateSubnetIds=$PRIVATE_SUBNET_IDS \
    PublicSubnetIds=$PUBLIC_SUBNET_IDS \
    ItemsTableName=$ITEMS_TABLE_NAME \
    ItemsTableArn=$ITEMS_TABLE_ARN \
    InventoryTableName=$INVENTORY_TABLE_NAME \
    InventoryTableArn=$INVENTORY_TABLE_ARN \
    LocationTableName=$LOCATION_TABLE_NAME \
    LocationTableArn=$LOCATION_TABLE_ARN \
    UsersTableName=$USERS_TABLE_NAME \
    UsersTableArn=$USERS_TABLE_ARN \
    UsernamesTableName=$USERNAMES_TABLE_NAME \
    UsernamesTableArn=$USERNAMES_TABLE_ARN \
    PersonaTableName=$PERSONA_TABLE_NAME \
    PersonaTableArn=$PERSONA_TABLE_ARN

# Check if deployment was successful
if [ $? -ne 0 ]; then
  echo "Error: Failed to deploy Fargate stack"
  exit 1
fi

# Get outputs from the Fargate stack
echo "Getting outputs from Fargate stack"
LOAD_BALANCER_DNS=$(aws cloudformation describe-stacks --stack-name $FARGATE_STACK_NAME --query "Stacks[0].Outputs[?OutputKey=='LoadBalancerDNS'].OutputValue" --output text)

echo "Deployment completed successfully!"
echo "Load Balancer DNS: $LOAD_BALANCER_DNS" 