<template>
  <div class="home">
    <div class="content">
      <h1>AI Scrapyard</h1>
      <p class="tagline">Explore, Collect, Build</p>
      
      <div class="description">
        <p>Welcome to the AI Scrapyard, where discarded items find new purpose. 
           Navigate through a mysterious landscape, collect unique items, and discover 
           their hidden potential.</p>
      </div>

      <div class="features">
        <div class="feature">
          <div class="feature-icon"><img src="../assets/computer.png" alt="AI" /></div>
          <h3>AI-Generated Items</h3>
          <p>Discover unique items with AI-generated descriptions and images</p>
        </div>
        <div class="feature">
          <div class="feature-icon"><img src="../assets/workbench.png" alt="Workbench" /></div>
          <h3>Interactive Environment</h3>
          <p>Interact with dispensers, workbenches, and garbage chutes</p>
        </div>
        <div class="feature">
          <div class="feature-icon"><img src="../assets/dispenser.png" alt="Dispenser" /></div>
          <h3>Physics-Based Gameplay</h3>
          <p>Experience real-time physics with collision detection</p>
        </div>
      </div>

      <router-link to="/play" class="play-button">
        Start Game
      </router-link>

      <div class="instructions">
        <h3>How to Play</h3>
        <p>Move around the scrapyard, collect items from dispensers, examine them at workbenches, and discard unwanted items down the chute. Build your collection of unique AI-generated treasures!</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: url('../assets/background.png'), linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%);
  background-size: cover;
  background-position: center;
  color: white;
  text-align: center;
}

.content {
  padding: 2rem;
  max-width: 900px;
  background-color: rgba(0, 0, 0, 0.7);
  border-radius: 10px;
  backdrop-filter: blur(5px);
}

h1 {
  font-size: 4rem;
  margin-bottom: 1rem;
  text-shadow: 0 0 10px rgba(76, 175, 80, 0.5);
}

.tagline {
  font-size: 1.5rem;
  color: #4CAF50;
  margin-bottom: 2rem;
}

.description {
  margin-bottom: 2rem;
  line-height: 1.6;
  color: #cccccc;
}

.features {
  display: flex;
  justify-content: space-between;
  margin-bottom: 2rem;
  flex-wrap: wrap;
}

.feature {
  flex: 1;
  min-width: 200px;
  padding: 1rem;
  margin: 0.5rem;
  background-color: rgba(76, 175, 80, 0.1);
  border-radius: 8px;
  border: 1px solid rgba(76, 175, 80, 0.3);
  transition: transform 0.3s ease;
}

.feature:hover {
  transform: translateY(-5px);
  background-color: rgba(76, 175, 80, 0.2);
}

.feature-icon {
  margin-bottom: 0.5rem;
}

.feature-icon img {
  width: 64px;
  height: 64px;
  object-fit: contain;
}

.feature h3 {
  margin-bottom: 0.5rem;
  color: #4CAF50;
}

.feature p {
  font-size: 0.9rem;
  color: #cccccc;
}

.play-button {
  display: inline-block;
  padding: 1rem 3rem;
  font-size: 1.2rem;
  text-decoration: none;
  color: white;
  background-color: #4CAF50;
  border-radius: 4px;
  transition: all 0.3s ease;
  margin: 1rem 0 2rem;
}

.play-button:hover {
  background-color: #45a049;
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(76, 175, 80, 0.4);
}

.instructions {
  margin-top: 1rem;
  padding: 1rem;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
}

.instructions h3 {
  color: #4CAF50;
  margin-bottom: 0.5rem;
}

@media (max-width: 768px) {
  .features {
    flex-direction: column;
  }
  
  .feature {
    margin-bottom: 1rem;
  }
  
  h1 {
    font-size: 3rem;
  }
}
</style>