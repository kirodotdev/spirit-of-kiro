# Product Overview

Spirit of Kiro is an infinite crafting workshop game that demonstrates AI-powered game development. The game features:

- **Infinite Item Generation**: Every item is unique with AI-generated names, descriptions, damage values, and quirks
- **Dynamic Crafting System**: Transform, combine, and improve items using realistic crafting mechanics powered by AI
- **Intelligent Appraisal**: AI-driven item valuation system for selling crafted goods
- **Real-time Multiplayer**: WebSocket-based client-server architecture for responsive gameplay

## Core Game Loop
1. Pull random items from the dispenser
2. Craft and modify items at the workbench using AI-powered transformations
3. Store items in inventory chest or sell them to the appraiser
4. Repeat with increasingly valuable and complex items

## AI Integration
The game heavily leverages AWS Bedrock models (Nova Pro, Claude Sonnet 3.7/4) for:
- Item generation and descriptions
- Crafting logic and transformations
- Item appraisal and pricing
- Image generation via Nova Canvas

This project serves as a demonstration of best practices for AI-assisted development and showcases how AI can power core game mechanics.