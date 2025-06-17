<template>
  <div class="home">
    <div class="hero">
      <div class="hero-content">
        <div class="hero-text">
          <h1>Spirit of Kiro</h1>
          <router-link to="/play" class="play-button">
            Enter
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: rgba(0, 0, 0, 0.9);
  color: white;
  text-align: center;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
}

.hero {
  padding: 2rem;
  width: 100%;
  max-width: 800px;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.hero-content {
  display: flex;
  align-items: center;
  justify-content: center;
}

.hero-text {
  text-align: center;
}

h1 {
  font-size: 4rem;
  font-weight: 600;
  margin-bottom: 2rem;
  color: white;
}

.play-button {
  display: inline-block;
  padding: 1rem 3rem;
  font-size: 1.2rem;
  font-weight: 500;
  text-decoration: none;
  color: white;
  background: #4CAF50;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.play-button:hover {
  background: #45a049;
}

@media (max-width: 768px) {
  h1 {
    font-size: 2.5rem;
  }

  .play-button {
    padding: 0.8rem 2rem;
    font-size: 1.1rem;
  }
}
</style>