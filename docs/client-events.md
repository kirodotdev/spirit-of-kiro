# Client-Side Events Documentation

This document lists all client-side events emitted throughout the game, their purpose, and their payload structure.

## Connection Events

### `reconnect-failed`
Emitted when a reconnection attempt to the server fails.
- **Payload**: None

### `reconnect-attempt`
Emitted when attempting to reconnect to the server.
- **Payload**:
  ```typescript
  {
    attempt: number;    // Current attempt number
    maxAttempts: number; // Maximum number of attempts allowed
  }
  ```

## Player Interaction Events

### `player-interaction`
Emitted when the player uses the "E" key to interact
- **Payload**: None

### `inspect-item`
Emitted when a player inspects an item.
- **Payload**:
  ```typescript
  {
    item: Item;  // The item being inspected
  }
  ```

### `item-pickup`
Emitted when a player picks up an item.
- **Payload**:
  ```typescript
  {
    item: Item;  // The item being picked up
  }
  ```

### `drop-item`
Emitted when a player drops an item.
- **Payload**:
  ```typescript
  {
    itemId: string;  // ID of the item being dropped
  }
  ```

## Workbench Events

### `clean-workbench-results`
Emitted to clear workbench results.
- **Payload**: None

### `workbench-overflow-item`
Emitted when an item overflows from the workbench.
- **Payload**:
  ```typescript
  {
    itemId: string;  // ID of the overflowing item
  }
  ```

### `skill-invoked`
Emitted when a skill is used at the workbench.
- **Payload**:
  ```typescript
  {
    skill: string;  // The skill being invoked
  }
  ```

## UI Events

### `hint`
Emitted to show a hint to the player.
- **Payload**:
  ```typescript
  {
    message: string;  // The hint message
  }
  ```

### `clear-hint`
Emitted to clear the current hint.
- **Payload**: None

### `announce`
Emitted to show an announcement.
- **Payload**:
  ```typescript
  {
    message: string;  // The announcement message
  }
  ```

## Game State Events

### `gold-update`
Emitted when the player's gold amount changes.
- **Payload**:
  ```typescript
  {
    gold: number;  // New gold amount
  }
  ```

### `intent-to-discard-item`
Emitted when a player intends to discard an item.
- **Payload**:
  ```typescript
  {
    itemId: string;  // ID of the item to discard
  }
  ```

## Physics Events
These events are emitted during physics interactions between objects.

#### `near-door`
Emitted when the player enters the door field area. Used to trigger a dialog from the shopkeeper.
- **Payload**:
  ```typescript
  {
    id: string;  // ID of the field object ('door-field')
  }
  ```

#### `sell-item`
Emitted when a thrown item enters the selling area field. Used to trigger the appraise and sell dialog.
- **Payload**:
  ```typescript
  {
    id: string;  // ID of the field object ('sell-field')
  }
  ```

## Lever Events

### `lever-pulled`
Emitted when the pull lever is pulled.
- **Payload**: None

### `pulled-item`
Emitted when the pull lever component finishes pulling an item from the server. Dispenser uses this to trigger.
- **Payload**:
  ```typescript
  {
    item: Item;  // The pulled item
  }
  ```

### `lever-reset`
Emitted when the lever resets.
- **Payload**:
  ```typescript
  {
    // Reset state information
  }
  ``` 