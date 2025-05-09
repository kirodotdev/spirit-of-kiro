# Project Structure

AI Scrapyard follows a client-server architecture with clear separation of concerns.

## Root Directory
- `launch.ts` - Main entry point that starts both client and server
- `docker-compose.yml` - Docker configuration for local development
- `package.json` - Root package with scripts to launch the application

## Client (`/client`)
The client is a Vue.js 3 application built with TypeScript and Vite.

### Key Directories
- `/client/src/assets` - Static assets including images, CSS, and game sprites
- `/client/src/components` - Vue components for game UI elements
- `/client/src/systems` - Core game systems:
  - `physics-system.ts` - Handles physics calculations and collision detection
  - `socket-system.ts` - Manages WebSocket communication with server
  - `game-object-system.ts` - Manages game objects and their state
  - `item-system.ts` - Handles inventory items and their properties
- `/client/src/stores` - Pinia store for global state management
- `/client/src/utils` - Utility functions and helpers
- `/client/src/views` - Vue router views/pages

### Architecture Patterns
- **Composition API** - Used throughout Vue components
- **System-based architecture** - Game logic is separated into systems
- **Reactive state management** - Using Pinia and Vue's reactivity system
- **Event-driven communication** - WebSocket events drive game state changes

## Server (`/server`)
The server is a Bun-based WebSocket server written in TypeScript.

### Key Directories
- `/server/handlers` - Request handlers for different message types
- `/server/llm` - AI integration for item generation
- `/server/state` - Server-side state management
- `/server/utils` - Utility functions
- `/server/__tests__` - Server tests

### Architecture Patterns
- **Message-based communication** - WebSocket messages with type and payload
- **Handler pattern** - Separate handlers for different message types
- **AWS service integration** - DynamoDB for persistence, S3 for storage, Bedrock for AI

## Infrastructure (`/iac`)
Contains AWS CloudFormation templates and deployment scripts.

- `/iac/distribution.yml` - CloudFront distribution configuration
- `/iac/images-s3.yml` - S3 bucket configuration for AI-generated images

## Docker Configuration
- `/docker` - Docker-related files and local development resources
- `/client/Dockerfile` - Client container configuration
- `/server/Dockerfile` - Server container configuration
- `/iac/Dockerfile` - Infrastructure deployment container