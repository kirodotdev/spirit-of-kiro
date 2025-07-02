# Project Structure

## Root Level Organization
```
├── client/           # Vue.js frontend application
├── server/           # Bun WebSocket server
├── item-images/      # Separate service for AI image generation
├── docs/             # Project documentation
├── scripts/          # Deployment and setup scripts
├── docker/           # Docker configuration and data
└── launch.ts         # Development launcher script
```

## Client Structure (`client/`)
- **src/components/**: Vue components for game UI elements (GameGrid, PlayerCharacter, etc.)
- **src/systems/**: Game logic systems (physics, inventory, socket communication)
- **src/stores/**: Pinia state management (game.ts)
- **src/views/**: Page-level Vue components (GameView, SignInView)
- **src/utils/**: Utility functions (physics, items, world initialization)
- **src/assets/**: Static assets (images, CSS, game sprites)
- **iac/**: Infrastructure as Code for client deployment

## Server Structure (`server/`)
- **handlers/**: WebSocket message handlers (pull-item, sell-item, etc.)
- **llm/**: AI integration (model.ts, prompts.ts, word-lists/)
- **state/**: Data persistence layer (item-store.ts, user-store.ts)
- **utils/**: Server utilities (password hashing, message formatting)
- **iac/**: Infrastructure as Code for server deployment
- **__tests__/**: Unit tests with Bun test framework

## Item Images Service (`item-images/`)
- **handlers/**: HTTP request handlers for image generation
- **lib/**: Core image generation logic
- **state/**: Vector database and Redis client integration
- **iac/**: Infrastructure as Code for image service deployment

## Key Architectural Patterns

### Frontend Systems Architecture
The client uses a system-based architecture where independent systems communicate via events:
- **Socket System**: Manages WebSocket communication
- **Physics System**: Handles collision detection and movement
- **Game Object System**: Tracks on-screen objects
- **Item/Inventory Systems**: Manage game items and storage

### Message-Driven Communication
- WebSocket messages follow consistent naming patterns (kebab-case)
- Server handlers are organized by message type
- Event-driven frontend updates maintain reactive state

### Infrastructure as Code
Each service has its own `iac/` directory containing:
- CloudFormation YAML templates
- Deployment scripts
- Environment-specific configurations

### Testing Structure
- Server tests in `__tests__/` directories alongside source code
- Client tests use Vitest with Vue Test Utils
- Test configuration in respective package.json files

## File Naming Conventions
- **kebab-case**: For file names, component names, and message types
- **camelCase**: For JavaScript/TypeScript variables and functions
- **PascalCase**: For Vue components and TypeScript interfaces
- **.ts/.js extensions**: TypeScript preferred, JavaScript for legacy word lists