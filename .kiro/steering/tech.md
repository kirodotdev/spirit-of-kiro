# Technology Stack

## Frontend
- **Framework**: Vue.js 3 with Composition API
- **Build Tool**: Vite
- **Language**: TypeScript
- **State Management**: Pinia
- **Routing**: Vue Router

## Backend
- **Runtime**: Bun
- **Language**: TypeScript
- **WebSocket**: Native Bun WebSocket server
- **Database**: Amazon DynamoDB
- **Storage**: Amazon S3 (for AI-generated images)
- **AI Services**: AWS Bedrock (for item generation)
- **AWS SDK:** AWS SDK for JavaScript v3

## Infrastructure
- **Containerization**: Docker and Docker Compose
- **Cloud Services**: AWS (DynamoDB, S3, CloudFront, Bedrock)
- **IaC**: CloudFormation templates (in the `iac` directory)

## Development Tools
- **Package Manager**: Bun
- **Testing**: Vitest (frontend), Bun test (backend)
- **Linting**: ESLint
- **Formatting**: Prettier

## Common Commands

### Development

Start both client and server in development mode:
```bash
bun start
# or
bun dev
```

### Client-specific Commands

```bash
# Navigate to client directory first
cd client

# Start development server
bun run dev

# Build for production
bun run build

# Run tests
bun run test:unit

# Lint code
bun run lint

# Format code
bun run format
```

### Server-specific Commands

```bash
# Navigate to server directory first
cd server

# Start server
bun start

# Run tests
bun test
```

### Docker Commands

```bash
# Start all services
podman compose up --watch

# Rebuild the services
podman compose build
```