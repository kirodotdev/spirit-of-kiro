<template>
  <div class="auth-screen">
    <!-- Floating particles for mystical effect -->
    <FloatingParticles :count="20" />
    
    <div class="utility-buttons-top">
      <button class="source-button" @click="openSourceCode">Source</button>
      <button class="guide-button" @click="openGuide">Guide</button>
    </div>
    <div class="auth-wrapper">
      <router-link to="/" class="back-link">← Back to Home</router-link>
      <div class="auth-container">
        <h1>Sign In</h1>
        
        <form @submit.prevent="handleSubmit" class="auth-form">
          <div class="form-group">
            <label for="username">Email Address</label>
            <input 
              type="email" 
              id="username" 
              v-model="username" 
              required
              autocomplete="email"
              inputmode="email"
              placeholder="your@email.com"
            />
          </div>
          
          <div class="form-group">
            <label for="password">Password</label>
            <input 
              type="password" 
              id="password" 
              v-model="password" 
              required
              autocomplete="current-password"
              inputmode="text"
              placeholder="Enter your password"
            />
          </div>

          <router-link to="/forgot-password" class="forgot-password-link">
            Forgot your password?
          </router-link>

          <div v-if="error" class="error-message">
            {{ error }}
            <router-link 
              v-if="error.includes('verify your email')" 
              to="/verify-email" 
              class="verify-link"
            >
              Go to verification
            </router-link>
          </div>

          <button type="submit" class="submit-button">
            Login
          </button>

          <router-link to="/signup" class="toggle-button">
            Need an account? Sign Up
          </router-link>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted, onMounted } from 'vue'
import { useGameStore } from '../stores/game'
import { useRouter } from 'vue-router'
import FloatingParticles from '../components/FloatingParticles.vue'

const gameStore = useGameStore()
const router = useRouter()
const username = ref('')
const password = ref('')
const error = ref('')

// Store listener IDs
let successListenerId: string | null = null;
let failureListenerId: string | null = null;

// Setup event listeners
const setupListeners = () => {
  // Remove any existing listeners first
  removeListeners();
  
  successListenerId = gameStore.addEventListener('signin_success', (data) => {
    if (data && data.userId) {
      gameStore.userId = data.userId
    }
    router.push('/play')
    removeListeners();
  })
  
  failureListenerId = gameStore.addEventListener('signin_failure', (data) => {
    const errorMessage = data || 'Authentication failed'
    
    // Check if this is an unverified email error
    if (errorMessage.includes('UserNotConfirmedException') || 
        errorMessage.includes('not confirmed') ||
        errorMessage.includes('verify your email')) {
      error.value = 'Please verify your email before signing in. Check your inbox for the verification code.'
      
      // Store email for potential resend
      sessionStorage.setItem('pendingVerificationEmail', username.value)
    } else {
      error.value = errorMessage
    }
    
    removeListeners();
  })
}

// Cleanup event listeners
const removeListeners = () => {
  if (successListenerId) {
    gameStore.removeEventListener('signin_success', successListenerId)
    successListenerId = null;
  }
  if (failureListenerId) {
    gameStore.removeEventListener('signin_failure', failureListenerId)
    failureListenerId = null;
  }
}

const openSourceCode = () => {
  window.open('https://github.com/kirodotdev/spirit-of-kiro/', '_blank')
}

const openGuide = () => {
  window.open('https://kiro.dev/docs/guides/learn-by-playing/', '_blank')
}

const handleSubmit = async () => {
  error.value = ''
  try {
    if (!gameStore.ws) {
      // Try to reconnect if WebSocket is not available
      gameStore.reconnect()
      throw new Error('No WebSocket connection available. Attempting to reconnect...')
    }

    // Setup listeners before sending message
    setupListeners();

    const message = {
      type: 'signin',
      body: {
        username: username.value,
        password: password.value
      }
    }

    // Send authentication message
    gameStore.ws.send(JSON.stringify(message))
  } catch (e: any) {
    error.value = e.message || 'An error occurred'
  }
}

// Setup connection status listeners
let connectionListenerId: string | null = null;
let reconnectFailedId: string | null = null;

onMounted(() => {
  // Listen for connection status changes
  connectionListenerId = gameStore.addEventListener('reconnect-attempt', (data) => {
    error.value = `Connection lost. Reconnecting... (${data.attempt}/${data.maxAttempts})`;
  });
  
  reconnectFailedId = gameStore.addEventListener('reconnect-failed', () => {
    error.value = 'Failed to reconnect. Please try again later.';
  });
});

// Cleanup listeners when component is unmounted
onUnmounted(() => {
  removeListeners();
  
  // Clean up connection status listeners
  if (connectionListenerId) {
    gameStore.removeEventListener('reconnect-attempt', connectionListenerId);
  }
  
  if (reconnectFailedId) {
    gameStore.removeEventListener('reconnect-failed', reconnectFailedId);
  }
})
</script>

<style scoped>
.auth-screen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: linear-gradient(135deg, 
    rgba(15, 5, 32, 0.95) 0%, 
    rgba(45, 15, 82, 0.95) 50%, 
    rgba(15, 5, 32, 0.95) 100%
  );
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  overflow: hidden;
}

.auth-wrapper {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 500px;
  max-width: 90vw;
  z-index: 10;
}

.back-link {
  color: rgba(218, 165, 32, 0.8);
  text-decoration: none;
  font-size: 0.9rem;
  transition: color 0.3s;
  margin-bottom: 1rem;
  align-self: flex-start;
  font-family: Georgia, 'Times New Roman', serif;
}

.back-link:hover {
  color: rgba(218, 165, 32, 1);
}

.auth-container {
  background: rgba(15, 5, 32, 0.7);
  border: 2px solid rgba(138, 43, 226, 0.5);
  border-radius: 20px;
  padding: 3rem;
  backdrop-filter: blur(10px);
  box-shadow: 
    0 0 30px rgba(138, 43, 226, 0.3),
    inset 0 0 20px rgba(138, 43, 226, 0.1);
  position: relative;
  width: 100%;
  animation: fadeIn 0.5s ease-in-out;
}

/* Corner ornaments */
.auth-container::before,
.auth-container::after {
  content: '';
  position: absolute;
  width: 20px;
  height: 20px;
  border: 2px solid rgba(218, 165, 32, 0.6);
}

.auth-container::before {
  top: 10px;
  left: 10px;
  border-right: none;
  border-bottom: none;
}

.auth-container::after {
  bottom: 10px;
  right: 10px;
  border-left: none;
  border-top: none;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

h1 {
  color: #e6d5ff;
  text-align: center;
  margin-bottom: 2rem;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 2rem;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

label {
  color: #e6d5ff;
  font-size: 0.9rem;
  font-family: Georgia, 'Times New Roman', serif;
}

input {
  padding: 0.75rem;
  border-radius: 8px;
  border: 2px solid rgba(138, 43, 226, 0.3);
  background: rgba(0, 0, 0, 0.3);
  color: #e6d5ff;
  /* Minimum 16px font-size to prevent iOS zoom on focus */
  font-size: max(16px, 1rem);
  transition: all 0.3s ease;
  min-height: 44px;
}

input:focus {
  outline: none;
  border-color: rgba(218, 165, 32, 0.8);
  box-shadow: 0 0 10px rgba(218, 165, 32, 0.3);
  background: rgba(0, 0, 0, 0.5);
}

input::placeholder {
  color: rgba(184, 163, 212, 0.5);
}

.submit-button {
  padding: 0.75rem 2rem;
  background: linear-gradient(135deg, 
    rgba(138, 43, 226, 0.8) 0%, 
    rgba(138, 43, 226, 0.6) 100%
  );
  color: #e6d5ff;
  border: 2px solid rgba(218, 165, 32, 0.5);
  border-radius: 8px;
  font-size: 1rem;
  font-family: Georgia, 'Times New Roman', serif;
  cursor: pointer;
  transition: all 0.3s ease;
  /* iOS touch target guideline: minimum 44x44px */
  min-height: 44px;
  min-width: 44px;
}

.submit-button:hover {
  background: linear-gradient(135deg, 
    rgba(138, 43, 226, 1) 0%, 
    rgba(138, 43, 226, 0.8) 100%
  );
  box-shadow: 0 0 20px rgba(138, 43, 226, 0.5);
  transform: translateY(-2px);
}

.toggle-button {
  background: none;
  border: none;
  color: rgba(218, 165, 32, 0.8);
  cursor: pointer;
  padding: 0.5rem;
  font-size: 0.9rem;
  text-decoration: none;
  text-align: center;
  font-family: Georgia, 'Times New Roman', serif;
  transition: color 0.3s;
}

.toggle-button:hover {
  color: rgba(218, 165, 32, 1);
  text-decoration: underline;
}

.error-message {
  color: #ff4444;
  text-align: center;
  font-size: 0.9rem;
  padding: 0.75rem;
  background: rgba(255, 68, 68, 0.1);
  border-radius: 8px;
  border: 1px solid rgba(255, 68, 68, 0.3);
  animation: shake 0.5s ease-in-out;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-10px); }
  75% { transform: translateX(10px); }
}

.forgot-password-link {
  color: rgba(218, 165, 32, 0.8);
  text-decoration: none;
  font-size: 0.85rem;
  text-align: right;
  margin-top: -0.5rem;
  transition: color 0.3s;
  font-family: Georgia, 'Times New Roman', serif;
}

.forgot-password-link:hover {
  color: rgba(218, 165, 32, 1);
  text-decoration: underline;
}

.verify-link {
  display: block;
  color: rgba(218, 165, 32, 0.8);
  text-decoration: underline;
  font-size: 0.85rem;
  margin-top: 0.5rem;
  transition: color 0.3s;
  font-family: Georgia, 'Times New Roman', serif;
}

.verify-link:hover {
  color: rgba(218, 165, 32, 1);
}

.utility-buttons-top {
  position: absolute;
  top: 20px;
  right: 20px;
  display: flex;
  gap: 10px;
  z-index: 1001;
}

.source-button {
  padding: 8px 16px;
  background-color: #2196F3;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.3s;
}

.source-button:hover {
  background-color: #1976D2;
}

.guide-button {
  padding: 8px 16px;
  background-color: #FF9800;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.3s;
}

.guide-button:hover {
  background-color: #F57C00;
}

/* Tablet responsiveness */
@media (max-width: 768px) {
  .auth-wrapper {
    width: 90vw;
  }
  
  .auth-container {
    padding: 2.5rem 2rem;
  }
  
  h1 {
    font-size: 1.75rem;
  }
  
  .utility-buttons-top {
    top: 10px;
    right: 10px;
    gap: 8px;
  }
  
  .source-button,
  .guide-button {
    padding: 6px 12px;
    font-size: 0.85rem;
  }
  
  .form-group {
    gap: 0.4rem;
  }
}

/* Mobile responsiveness */
@media (max-width: 480px) {
  .auth-screen {
    padding: 1rem;
  }
  
  .auth-wrapper {
    width: 100%;
    max-width: 100%;
  }
  
  .auth-container {
    padding: 1.5rem 1rem;
    margin: 0;
    border-radius: 15px;
  }
  
  h1 {
    font-size: 1.5rem;
    margin-bottom: 1.5rem;
  }
  
  .auth-form {
    gap: 1.25rem;
  }
  
  .form-group {
    gap: 0.4rem;
  }
  
  label {
    font-size: 0.85rem;
  }
  
  input {
    padding: 0.65rem;
    font-size: 0.95rem;
  }
  
  .submit-button {
    padding: 0.75rem 1.5rem;
    font-size: 0.9rem;
    width: 100%;
  }
  
  .toggle-button {
    font-size: 0.85rem;
    padding: 0.4rem;
  }
  
  .back-link {
    font-size: 0.85rem;
    margin-bottom: 0.75rem;
  }
  
  .forgot-password-link {
    font-size: 0.8rem;
    margin-top: -0.4rem;
  }
  
  .error-message {
    font-size: 0.85rem;
    padding: 0.6rem;
  }
  
  .verify-link {
    font-size: 0.8rem;
  }
}
</style> 