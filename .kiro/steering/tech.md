# Technology Stack

## Runtime & Build System
- **Bun**: Primary JavaScript runtime for both client and server development
- **Docker/Podman**: Containerized development environment with compose orchestration
- **TypeScript**: Used throughout the codebase for type safety

## Frontend (Client)
- **Vue.js 3**: Component-based UI framework using Composition API
- **Pinia**: State management for reactive game state
- **Vite**: Build tool and development server
- **Vue Router**: Client-side routing
- **Vitest**: Unit testing framework

## Backend (Server)
- **Bun WebSocket Server**: Real-time bidirectional communication
- **AWS SDK**: Integration with AWS services
- **Sharp**: Image processing library
- **Redis**: Caching and session management

## AWS Services
- **Amazon Bedrock**: AI model integration (Nova Pro, Claude Sonnet 3.7/4, Nova Canvas, Titan Text Embeddings v2)
- **DynamoDB**: Game state and inventory persistence
- **Amazon Cognito**: User authentication and authorization
- **S3 + CloudFront**: Asset storage and content delivery
- **MemoryDB**: Vector database for image matching

## Development Commands

### Root Level
```bash
# Start both client and server in development mode
bun dev

# Install dependencies across all packages
bun install
```

### Client Commands
```bash
cd client
bun run dev          # Start development server
bun run build        # Production build
bun run preview      # Preview production build
bun run test:unit    # Run unit tests
bun run lint         # Lint and fix code
bun run format       # Format code with Prettier
```

### Server Commands
```bash
cd server
bun --watch server.ts           # Start server with hot reload
bun test                        # Run tests with JUnit output
bun run bootstrap-dynamodb      # Setup local DynamoDB tables
```

### Infrastructure Setup
```bash
# Deploy Cognito resources
./scripts/deploy-cognito.sh game-auth

# Start containerized stack
podman compose build && podman compose up --watch

# Bootstrap local DynamoDB (first time only)
podman exec server bun run /app/bootstrap-local-dynamodb.js
```

## Code Quality
- **ESLint**: Linting with Vue and TypeScript configurations
- **Prettier**: Code formatting
- **TypeScript**: Strict type checking enabled
- **Vitest**: Unit testing with coverage reporting