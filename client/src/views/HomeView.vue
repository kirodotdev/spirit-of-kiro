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

      <router-link to="/play" class="play-button">
        Start Game
      </router-link>
    </div>
  </div>
</template>

<style scoped>
.home {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%);
  color: white;
  text-align: center;
}

.content {
  padding: 2rem;
  max-width: 800px;
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
  margin-bottom: 3rem;
  line-height: 1.6;
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
}

.play-button:hover {
  background-color: #45a049;
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(76, 175, 80, 0.4);
}
</style>