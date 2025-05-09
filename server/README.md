# Scrapyard Game Server

This project implements a WebSocket-based game server that handles real-time multiplayer game interactions.

## Overview

The server is built using WebSocket technology to provide bidirectional communication between the game clients and the server. It manages game state, player connections, and real-time updates.

## Features

- Real-time WebSocket communication
- Player connection management
- Game state synchronization
- Secure WebSocket implementation

## Technical Details

The server is implemented in TypeScript using the WebSocket protocol. It handles:

- Connection establishment and management
- Player authentication and session handling
- Real-time game state updates
- Error handling and connection recovery

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

The WebSocket server will start listening for connections on the configured port.

## Configuration

The server can be configured through environment variables:
- `PORT`: The port number for the WebSocket server (default: 8080)

## Security

The server implements standard WebSocket security practices including:
- Connection validation
- Input sanitization
- Rate limiting

## Error Handling

The server includes robust error handling for:
- Connection failures
- Invalid messages
- Protocol errors
- Resource cleanup on disconnection

