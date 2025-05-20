# Player Trail Effect Design Document

## Overview

The Player Trail Effect feature will enhance the visual feedback of player movement by adding ghostly sparkles that appear behind the player character as they move through the game world. These sparkle effects will fade away gradually over a period of two seconds, creating a visually appealing trail that follows the player's path. This feature aims to improve the game's visual aesthetics and provide players with clearer feedback about their movement and position in the game world.

The trail effect will be implemented as a new system in the game's architecture, following the existing pattern of system-based design. It will integrate with the game's existing physics and rendering systems, and will be configurable by the player through a settings option.

## Architecture

The trail effect will be implemented using the following architectural components:

1. **Particle System**: A new system that will manage the creation, animation, and lifecycle of particle effects in the game. This will be a general-purpose system that can be used for other particle effects in the future.

2. **Trail Effect Component**: A Vue component that will render the trail particles behind the player character.

3. **Game Store Integration**: The particle system will be integrated into the game's Pinia store, following the existing pattern of system-based architecture.

4. **Settings Integration**: A toggle option will be added to allow players to enable or disable the trail effect.

### System Flow

1. The player character's position is tracked in real-time.
2. When movement is detected, the particle system generates sparkle particles at the player's previous position.
3. Each particle is assigned properties including position, size, opacity, and lifespan.
4. The particle system updates all particles on each animation frame, reducing their opacity over time.
5. Particles that have reached the end of their 2-second lifespan are removed from the system.
6. The trail effect can be toggled on/off through a user setting.

## Components and Interfaces

### 1. Particle System (`particle-system.ts`)

```typescript
export interface Particle {
  id: string;
  x: number;
  y: number;
  size: number;
  opacity: number;
  createdAt: number;
  lifespan: number;
  color: string;
}

export class ParticleSystem {
  private particles: Ref<Particle[]>;
  private lastTimestamp: number;
  private animationFrameId: number | null;
  private enabled: Ref<boolean>;

  constructor(particles: Ref<Particle[]>, enabled: Ref<boolean>) {
    this.particles = particles;
    this.enabled = enabled;
    this.lastTimestamp = performance.now();
    this.animationFrameId = null;
  }

  start(): void;
  stop(): void;
  createParticle(x: number, y: number, options?: Partial<Omit<Particle, 'id' | 'createdAt'>>): void;
  update(timestamp: number): void;
  updateParticles(deltaTime: number): void;
  cleanupExpiredParticles(): void;
}
```

### 2. Trail Effect Component (`TrailEffect.vue`)

```vue
<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '../stores/game';

interface Props {
  tileSize: number;
}

const props = defineProps<Props>();
const gameStore = useGameStore();
const particles = computed(() => gameStore.trailParticles);
</script>

<template>
  <div class="trail-container">
    <div 
      v-for="particle in particles" 
      :key="particle.id"
      class="trail-particle"
      :style="{
        position: 'absolute',
        left: `${particle.x * tileSize}px`,
        top: `${particle.y * tileSize}px`,
        width: `${particle.size * tileSize}px`,
        height: `${particle.size * tileSize}px`,
        opacity: particle.opacity,
        backgroundColor: particle.color,
        borderRadius: '50%',
        filter: 'blur(2px)',
        pointerEvents: 'none'
      }"
    ></div>
  </div>
</template>
```

### 3. Game Store Integration

```typescript
// In game.ts
import { ParticleSystem, type Particle } from '../systems/particle-system';

export const useGameStore = defineStore('game', () => {
  // Existing state...
  
  // Trail effect state
  const trailParticles = ref<Particle[]>([]);
  const trailEffectEnabled = ref(true); // Default to enabled
  
  // Existing systems...
  
  // Initialize particle system
  const particleSystem = new ParticleSystem(trailParticles, trailEffectEnabled);
  
  return {
    // Existing state and methods...
    
    // Trail effect state
    trailParticles,
    trailEffectEnabled,
    
    // Trail effect methods
    createTrailParticle: particleSystem.createParticle.bind(particleSystem),
    startParticleSystem: particleSystem.start.bind(particleSystem),
    stopParticleSystem: particleSystem.stop.bind(particleSystem),
    toggleTrailEffect: (enabled: boolean) => {
      trailEffectEnabled.value = enabled;
      if (enabled) {
        particleSystem.start();
      } else {
        particleSystem.stop();
      }
    }
  };
});
```

### 4. Player Character Integration

```typescript
// In PlayerCharacter.vue
import { watch, ref } from 'vue';

// Previous position tracking
const prevRow = ref(props.row);
const prevCol = ref(props.col);

// Watch for position changes
watch(
  () => [props.row, props.col],
  ([newRow, newCol]) => {
    if (gameStore.trailEffectEnabled && (newRow !== prevRow.value || newCol !== prevCol.value)) {
      // Create trail particles at the previous position
      const particleCount = Math.min(5, Math.max(1, Math.floor(Math.random() * 3) + 1));
      
      for (let i = 0; i < particleCount; i++) {
        // Add some randomness to particle position
        const offsetX = (Math.random() - 0.5) * 0.5;
        const offsetY = (Math.random() - 0.5) * 0.5;
        
        gameStore.createTrailParticle(
          prevCol.value + offsetX,
          prevRow.value + offsetY,
          {
            size: Math.random() * 0.2 + 0.1, // Random size between 0.1 and 0.3
            lifespan: 2000, // 2 seconds
            color: 'rgba(255, 255, 255, 0.8)'
          }
        );
      }
    }
    
    // Update previous position
    prevRow.value = newRow;
    prevCol.value = newCol;
  }
);
```

## Data Models

### Particle

The core data model for the trail effect is the `Particle` interface:

```typescript
export interface Particle {
  id: string;           // Unique identifier for the particle
  x: number;            // X position in tile coordinates
  y: number;            // Y position in tile coordinates
  size: number;         // Size as a fraction of tile size
  opacity: number;      // Opacity from 0 to 1
  createdAt: number;    // Timestamp when the particle was created
  lifespan: number;     // Duration in milliseconds before the particle disappears
  color: string;        // CSS color string
}
```

### Settings

The trail effect will be configurable through a user setting:

```typescript
interface GameSettings {
  // Existing settings...
  trailEffectEnabled: boolean;
}
```

## Error Handling

The particle system will include the following error handling mechanisms:

1. **Performance Monitoring**: The system will track the number of active particles and limit creation if a threshold is exceeded.

2. **Animation Frame Management**: Proper cleanup of animation frames when the component is unmounted or the effect is disabled.

3. **Graceful Degradation**: If the system detects performance issues, it will automatically reduce the number of particles generated.

4. **Error Boundaries**: The trail effect component will be wrapped in an error boundary to prevent rendering issues from affecting the rest of the game.

5. **Null Checks**: All operations will include appropriate null checks to prevent errors when accessing properties.

Example implementation:

```typescript
// In particle-system.ts
createParticle(x: number, y: number, options?: Partial<Omit<Particle, 'id' | 'createdAt'>>) {
  // Performance check - limit total particles
  if (this.particles.value.length >= this.maxParticles) {
    // Remove oldest particle if at capacity
    this.particles.value.shift();
  }
  
  try {
    const particle: Particle = {
      id: `particle-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      x,
      y,
      size: options?.size || 0.2,
      opacity: options?.opacity || 1,
      createdAt: performance.now(),
      lifespan: options?.lifespan || 2000,
      color: options?.color || 'rgba(255, 255, 255, 0.8)'
    };
    
    this.particles.value.push(particle);
  } catch (error) {
    console.error('Error creating particle:', error);
  }
}
```

## Testing Strategy

The testing strategy for the trail effect feature will include:

### 1. Unit Tests

- Test the `ParticleSystem` class methods:
  - Particle creation
  - Particle lifecycle management
  - Opacity calculation over time
  - Cleanup of expired particles

```typescript
// Example test
describe('ParticleSystem', () => {
  test('should create particles with correct properties', () => {
    const particles = ref<Particle[]>([]);
    const enabled = ref(true);
    const system = new ParticleSystem(particles, enabled);
    
    system.createParticle(10, 20, { size: 0.3, lifespan: 1000 });
    
    expect(particles.value.length).toBe(1);
    expect(particles.value[0].x).toBe(10);
    expect(particles.value[0].y).toBe(20);
    expect(particles.value[0].size).toBe(0.3);
    expect(particles.value[0].lifespan).toBe(1000);
  });
  
  test('should remove expired particles', () => {
    const particles = ref<Particle[]>([]);
    const enabled = ref(true);
    const system = new ParticleSystem(particles, enabled);
    
    // Add a particle with a very short lifespan
    system.createParticle(10, 20, { lifespan: 10 });
    
    // Wait for the particle to expire
    jest.advanceTimersByTime(20);
    system.cleanupExpiredParticles();
    
    expect(particles.value.length).toBe(0);
  });
});
```

### 2. Component Tests

- Test the `TrailEffect` component rendering:
  - Verify particles are rendered at correct positions
  - Verify particles have correct styling based on their properties

```typescript
// Example test
describe('TrailEffect', () => {
  test('renders particles at correct positions', async () => {
    const store = useGameStore();
    store.trailParticles = [
      { id: '1', x: 10, y: 20, size: 0.3, opacity: 0.8, createdAt: Date.now(), lifespan: 2000, color: 'white' }
    ];
    
    const wrapper = mount(TrailEffect, {
      props: { tileSize: 50 }
    });
    
    const particle = wrapper.find('.trail-particle');
    expect(particle.exists()).toBe(true);
    expect(particle.attributes('style')).toContain('left: 500px');
    expect(particle.attributes('style')).toContain('top: 1000px');
  });
});
```

### 3. Integration Tests

- Test the integration with the player character:
  - Verify particles are created when the player moves
  - Verify particles are not created when the effect is disabled
  - Verify particles fade out over time

```typescript
// Example test
describe('Player movement with trail effect', () => {
  test('creates particles when player moves', async () => {
    const store = useGameStore();
    store.trailEffectEnabled = true;
    
    const wrapper = mount(PlayerCharacter, {
      props: { id: 'player', row: 10, col: 10, /* other props */ }
    });
    
    // Simulate player movement
    await wrapper.setProps({ row: 11, col: 10 });
    
    // Check that particles were created
    expect(store.trailParticles.length).toBeGreaterThan(0);
  });
  
  test('does not create particles when effect is disabled', async () => {
    const store = useGameStore();
    store.trailEffectEnabled = false;
    
    const wrapper = mount(PlayerCharacter, {
      props: { id: 'player', row: 10, col: 10, /* other props */ }
    });
    
    // Simulate player movement
    await wrapper.setProps({ row: 11, col: 10 });
    
    // Check that no particles were created
    expect(store.trailParticles.length).toBe(0);
  });
});
```

### 4. Performance Tests

- Test the system under high load:
  - Create many particles and measure frame rate
  - Verify the system limits particle creation when necessary
  - Test on different devices to ensure consistent performance

```typescript
// Example performance test
describe('ParticleSystem performance', () => {
  test('limits particle count to maintain performance', () => {
    const particles = ref<Particle[]>([]);
    const enabled = ref(true);
    const system = new ParticleSystem(particles, enabled);
    system.maxParticles = 100;
    
    // Create 150 particles
    for (let i = 0; i < 150; i++) {
      system.createParticle(10, 20);
    }
    
    // Verify that only 100 particles were created
    expect(particles.value.length).toBe(100);
  });
});
```

### 5. User Acceptance Testing

- Manual testing scenarios:
  - Verify the visual appearance of the trail effect
  - Test enabling/disabling the effect through settings
  - Test the effect with different player movement patterns
  - Verify the effect works correctly on different screen sizes and devices