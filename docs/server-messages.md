# Server Message Types

This document outlines all the message types that the game server handles via WebSocket connections.

## Message Format

All messages should be sent as JSON strings with the following structure:
```json
{
  "type": "message_type",
  // Additional message-specific fields
}
```

## Response Format

The server responds to all messages using a standardized format:
```json
{
  "type": "response_type",
  "body": {} // Optional response data
}
``` 

## Error Responses

All message types can return the following error responses:
```json
{
  "type": "error",
  "body": "Authentication required"
}
```

## Item Structure

Items in responses follow this structure:
```json
{
  "id": "string",
  "name": "string",
  "description": "string",
  "icon": "string",
  "imageUrl": "string",
  "value": "number",
  "weight": "string",
  "damage": "string",
  "materials": ["string"],
  "skills": [
    {
      "name": "string",
      "description": "string",
      "targets": "number" // 0 for self, 1 for single target, 2 for two targets
    }
  ]
}
```

## Message Types

### ping
A simple ping message to check server connectivity.

Request:
```json
{
  "type": "ping"
}
```

Response:
```json
{
  "type": "pong"
}
```

### signup
Message for user registration.

Request:
```json
{
  "type": "signup",
  "body": {
    "username": "string",
    "password": "string"
  }
}
```

Response:
```json
{
  "type": "signup_success",
  "body": {
    "userId": "string"
  }
}
```

### signin
Message for user authentication.

Request:
```json
{
  "type": "signin",
  "body": {
    "username": "string",
    "password": "string"
  }
}
```

Response:
```json
{
  "type": "signin_success",
  "body": {
    "userId": "string"
  }
}
```

### pull-item
Message to pull/retrieve an item.

Request:
```json
{
  "type": "pull-item"
}
```

Response:
```json
{
  "type": "pulled-item",
  "body": {
    "story": "string",
    "item": {
      "id": "string",
      "name": "string",
      "description": "string",
      "icon": "string",
      "imageUrl": "string",
      "value": "number",
      "weight": "string",
      "damage": "string",
      "materials": ["string"],
      "skills": [
        {
          "name": "string",
          "description": "string",
          "targets": "number"
        }
      ]
    }
  }
}
```

### list-inventory
Message to retrieve the user's inventory contents.

Request:
```json
{
  "type": "list-inventory",
  "body": {
    "inventoryId": "string"
  }
}
```

Response:
```json
{
  "type": "inventory-items:inventoryName",
  "body": [
    {
      "id": "string",
      "name": "string",
      "description": "string",
      "icon": "string",
      "imageUrl": "string",
      "value": "number",
      "weight": "string",
      "damage": "string",
      "materials": ["string"],
      "skills": [
        {
          "name": "string",
          "description": "string",
          "targets": "number"
        }
      ]
    }
  ]
}
```

Error Responses:
```json
{
  "type": "error",
  "body": "Cannot access inventory {inventoryId}"
}
```

### discard-item
Message to discard/remove an item from inventory.

Request:
```json
{
  "type": "discard-item",
  "body": {
    "itemId": "string"
  }
}
```

Response:
```json
{
  "type": "item-discarded",
  "body": {
    "itemId": "string"
  }
}
```

Error Responses:
```json
{
  "type": "error",
  "body": "Item not found"
}
```
```json
{
  "type": "error",
  "body": "Item not in your inventory"
}
```

### move-item
Message to move an item within the inventory.

Request:
```json
{
  "type": "move-item",
  "body": {
    "itemId": "string",
    "targetInventoryId": "string"
  }
}
```

Response:
```json
{
  "type": "item-moved",
  "body": {
    "itemId": "string",
    "targetInventoryId": "string"
  }
}
```

Error Responses:
```json
{
  "type": "error",
  "body": "Item not found"
}
```
```json
{
  "type": "error",
  "body": "Can't move item that you don't own"
}
```
```json
{
  "type": "error",
  "body": "Invalid target inventory"
}
```
```json
{
  "type": "error",
  "body": "Item is already in the given inventory"
}
```

### use-skill
Message to use a skill, which may affect the WebSocket connection.

Request:
```json
{
  "type": "use-skill",
  "body": {
    "toolId": "string",
    "toolSkillIndex": "number",
    "targetIds": ["string"]
  }
}
```

Responses:
```json
{
  "type": "skill-use-story",
  "body": {
    "story": "string"
  }
}
```
```json
{
  "type": "skill-results",
  "body": {
    "story": "string",
    "tool": {
      "id": "string",
      "name": "string",
      "description": "string",
      "icon": "string",
      "imageUrl": "string",
      "value": "number",
      "weight": "string",
      "damage": "string",
      "materials": ["string"],
      "skills": [
        {
          "name": "string",
          "description": "string",
          "targets": "number"
        }
      ]
    },
    "outputItems": [
      {
        "id": "string",
        "name": "string",
        "description": "string",
        "icon": "string",
        "imageUrl": "string",
        "value": "number",
        "weight": "string",
        "damage": "string",
        "materials": ["string"],
        "skills": [
          {
            "name": "string",
            "description": "string",
            "targets": "number"
          }
        ]
      }
    ],
    "removedItemIds": ["string"]
  }
}
```

Error Responses:
```json
{
  "type": "error",
  "body": "Tool item not found"
}
```
```json
{
  "type": "error",
  "body": "Can't use a tool that you don't own"
}
```
```json
{
  "type": "error",
  "body": "Tool item does not have a skill at index {index}"
}
```
```json
{
  "type": "error",
  "body": "Can't use a skill on an item that you don't own"
}
```

### sell-item
Message to sell an item.

Request:
```json
{
  "type": "sell-item",
  "body": {
    "itemId": "string"
  }
}
```

Response:
```json
{
  "type": "item-sold",
  "body": {
    "itemId": "string",
    "appraisal": {
      "appraisal": {
        "saleAmount": "number"
      }
    },
    "gold": "number"
  }
}
```

Error Responses:
```json
{
  "type": "error",
  "body": "Item not found"
}
```
```json
{
  "type": "error",
  "body": "Item not in your inventory"
}
```

### fetch-persona
Message to retrieve user persona information.

Request:
```json
{
  "type": "fetch-persona",
  "body": {}
}
```

Response:
```json
{
  "type": "persona-details",
  "body": {
    "gold": "string",
    // Additional persona details
  }
}
```

### peek-discarded
Message to view discarded items.

Request:
```json
{
  "type": "peek-discarded",
  "body": {
    "numberOfItems": "number"
  }
}
```

Response:
```json
{
  "type": "discarded-results",
  "body": [
    {
      "id": "string",
      "name": "string",
      "description": "string",
      "icon": "string",
      "imageUrl": "string",
      "value": "number",
      "weight": "string",
      "damage": "string",
      "materials": ["string"],
      "skills": [
        {
          "name": "string",
          "description": "string",
          "targets": "number"
        }
      ]
    }
  ]
}
```

### buy-discarded
Message to purchase previously discarded items.

Request:
```json
{
  "type": "buy-discarded",
  "body": {
    "itemId": "string"
  }
}
```

Response:
```json
{
  "type": "buy-results",
  "body": {
    "itemId": "string",
    "item": {
      "id": "string",
      "name": "string",
      "description": "string",
      "icon": "string",
      "imageUrl": "string",
      "value": "number",
      "weight": "string",
      "damage": "string",
      "materials": ["string"],
      "skills": [
        {
          "name": "string",
          "description": "string",
          "targets": "number"
        }
      ]
    },
    "gold": "number",
    "purchasePrice": "number"
  }
}
```

Error Responses:
```json
{
  "type": "error",
  "body": "Item not found in discarded items"
}
```
```json
{
  "type": "error",
  "body": "Not enough gold to purchase this item"
}
```
