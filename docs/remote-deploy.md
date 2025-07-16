# Infrastructure Operations Guide

This guide explains how to deploy the Spirit of Kiro infrastructure to AWS. The infrastructure consists of several components:

- Server:
  * DynamoDB tables for data storage
  * ECS Fargate service for running the server
  * Application Load Balancer for routing traffic
  * ECR repository for container images

- Item Images Service:
  * S3 bucket for image storage
  * CloudFront distribution for image delivery
  * MemoryDB cluster for vector storage
  * ECS Fargate service for image generation
  * ECR repository for container images

- Client:
  * S3 bucket for static website hosting
  * CloudFront distribution with basic authentication
  * Lambda@Edge for authentication

## Prerequisites

Before deploying the infrastructure, ensure you have:

1. An AWS account with appropriate permissions
2. AWS CLI installed and configured with credentials
3. Podman or Docker installed locally
4. Access to the following AWS services:
   - AWS Bedrock (for AI features)
   - Amazon ECS
   - Amazon ECR
   - Amazon DynamoDB
   - Amazon VPC
   - Amazon CloudWatch
   - Amazon S3
   - Amazon CloudFront
   - Amazon MemoryDB
   - AWS Lambda

## Deployment Steps

### Clone and Prepare the Repository

```bash
git clone git@github.com:kirodotdev/spirit-of-kiro.git
cd spirit-of-kiro
```

### Production Deployment

For production deployments, use the automated deployment script that handles all components in the correct order:

```bash
./scripts/prod-deploy.sh
```

This script will:
1. Deploy the item-images service to `us-west-2`
2. Deploy the server to `us-west-2`
3. Deploy the client to `us-east-1` (Necessary for Lamdbda@Edge)
4. Configure all necessary connections between components

### Manual Deployment Steps

If you need to deploy components individually, follow these steps:

#### Deploy the Item Images Service

The item images service deployment will:
1. Create an S3 bucket for image storage
2. Set up a CloudFront distribution
3. Create a MemoryDB cluster for vector storage
4. Deploy the Fargate service for image generation

To deploy, run:

```bash
cd item-images/iac
./deploy.sh <stack-name-prefix>
```

_The demo deployment uses stack name `kiro-game-images`_

The script will:
- Use the default VPC and subnets
- Create an ECR repository
- Build and push the container image
- Deploy the CloudFormation templates

#### Deploy the Server Infrastructure

The server deployment process is automated using a deployment script. The script will:
1. Create DynamoDB tables
2. Set up an ECR repository
3. Build and push the container image
4. Deploy the Fargate service

To deploy, run:

```bash
cd server/iac
./deploy.sh <address of item image server>
```

The script will:
- Use the default VPC and subnets
- Create an ECR repository
- Build and push the container image
- Deploy the CloudFormation templates

#### Deploy the Client Application

The client deployment will:
1. Build the Vue.js application
2. Use CloudFormation to deploy an S3 bucket for static hosting and a CloudFront distribution with basic authentication
3. Upload the static site built to S3 and invalidate the CFN distribution

To deploy, run:

```bash
cd client/iac
./deploy.sh <websocket-server-address>
```

_The demo deployment uses stack name `web-app`_

Replace `<websocket-server-address>` with the address of your deployed server (e.g., `alb-123456.us-east-1.elb.amazonaws.com:8080`).

### Verify the Deployment

After deployment completes, you can verify each component:

1. Server:
   - Check the CloudFormation stacks in the AWS Console
   - Verify the ECS service is running
   - Test the Load Balancer endpoint

2. Item Images Service:
   - Verify the S3 bucket is created
   - Check the CloudFront distribution is enabled
   - Confirm the MemoryDB cluster is active
   - Test the image generation service

3. Client:
   - Access the CloudFront distribution URL
   - Verify basic authentication works
   - Test WebSocket connectivity
   - Check that the game loads correctly

## Infrastructure Components

### Server Components
- DynamoDB Tables:
  * `Items`: Stores game item metadata
  * `Inventory`: Tracks player inventories
  * `Location`: Maps items to game locations
  * `Users`: Stores user information
  * `Usernames`: Maps usernames to user IDs
  * `Persona`: Stores user persona details

- ECS Fargate Service:
  * Runs on ARM64 architecture
  * Uses Fargate for serverless container execution
  * Configured with auto-scaling capabilities
  * Includes CloudWatch logging

### Item Images Service Components
- S3 Bucket:
  * Versioning enabled
  * Private access
  * CloudFront origin

- CloudFront Distribution:
  * HTTPS enabled
  * S3 origin with OAC
  * Caching configured

- MemoryDB Cluster:
  * Redis 7.1
  * Vector search enabled
  * Multi-AZ deployment

- ECS Fargate Service:
  * Image generation service
  * Bedrock integration
  * Vector storage integration

### Client Components
- S3 Bucket:
  * Static website hosting
  * Private access
  * CloudFront origin

- CloudFront Distribution:
  * Basic authentication
  * WebSocket routing
  * SPA routing support
  * HTTPS enabled

## Monitoring and Maintenance

### CloudWatch Logs
- Server logs: `/ecs/<stack-name>`
- Item Images logs: `/ecs/<stack-name>-images`
- Retention period: 30 days

### Scaling
Each service is configured to run 2 tasks by default. You can adjust this by:
1. Modifying the `DesiredCount` parameter in the CloudFormation template
2. Setting up auto-scaling policies based on metrics

### Updates
To update any component:
1. Make your code changes
2. Run the deployment script again with the same stack name prefix
3. The script will build a new container image and update the service

## Security Considerations

- IAM roles with least privilege
- Security groups restrict access to necessary ports
- All tables use on-demand capacity mode
- Basic authentication for client access
- CloudFront with HTTPS
- MemoryDB with VPC security
- Consider enabling AWS WAF for additional protection

## Troubleshooting

Common issues and solutions:

1. **Deployment fails with VPC errors**
   - Ensure you have a default VPC in your AWS account
   - Verify you have sufficient subnets in the VPC

2. **Container fails to start**
   - Check CloudWatch logs for error messages
   - Verify environment variables are correctly set

3. **Load Balancer health checks fail**
   - Ensure the application is listening on the correct port
   - Check security group rules allow traffic

4. **DynamoDB access issues**
   - Verify IAM roles have correct permissions
   - Check table names match environment variables

5. **WebSocket connection fails**
   - Verify the WebSocket endpoint is correctly configured
   - Check CloudFront WebSocket routing settings
   - Ensure security groups allow WebSocket traffic

6. **Image generation fails**
   - Verify Bedrock permissions
   - Check MemoryDB connectivity
   - Ensure S3 bucket permissions are correct

For additional help, check the CloudFormation stack events in the AWS Console. 
