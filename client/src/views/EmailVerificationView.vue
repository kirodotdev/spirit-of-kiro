<template>
  <div class="auth-screen">
    <!-- Floating particles for mystical effect -->
    <FloatingParticles :count="20" />
    
    <div class="utility-buttons-top">
      <button class="source-button" @click="openSourceCode">Source</button>
      <button class="guide-button" @click="openGuide">Guide</button>
    </div>
    <div class="auth-wrapper">
      <router-link to="/signup" class="back-link">← Back to Sign Up</router-link>
      <div class="verification-frame">
        <h1>Verify Your Email</h1>
        <p class="instruction-text">
          We've sent a 6-digit verification code to<br />
          <strong>{{ email }}</strong>
        </p>

        <CodeInput
          v-model="codeDigits"
          :disabled="isVerifying"
          @complete="verifyCode"
        />

        <div v-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </div>

        <div class="resend-section">
          <button
            class="resend-button"
            :disabled="resendCooldown > 0 || isVerifying"
            @click="resendCode"
          >
            {{ resendCooldown > 0 ? `Resend Code (${resendCooldown}s)` : 'Resend Code' }}
          </button>
        </div>

        <div v-if="isVerifying" class="loading-indicator">
          Verifying...
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '../stores/game'
import CodeInput from '../components/CodeInput.vue'
import FloatingParticles from '../components/FloatingParticles.vue'

const router = useRouter()
const gameStore = useGameStore()

// Component state
const email = ref('')
const codeDigits = ref<string[]>(['', '', '', '', '', ''])
const isVerifying = ref(false)
const errorMessage = ref('')
const resendCooldown = ref(0)

// Store listener IDs
let verifySuccessListenerId: string | null = null
let verifyFailureListenerId: string | null = null
let resendSuccessListenerId: string | null = null
let resendFailureListenerId: string | null = null

// Cooldown timer interval
let cooldownInterval: number | null = null

// Retrieve email from sessionStorage on mount
onMounted(() => {
  const pendingEmail = sessionStorage.getItem('pendingVerificationEmail')
  
  if (!pendingEmail) {
    // No email found, redirect to sign up
    router.push('/signup')
    return
  }
  
  email.value = pendingEmail
  setupListeners()
})

// Setup event listeners
const setupListeners = () => {
  // Remove any existing listeners first
  removeListeners()
  
  verifySuccessListenerId = gameStore.addEventListener('verify_email_success', () => {
    // Clear sessionStorage
    sessionStorage.removeItem('pendingVerificationEmail')
    // Redirect to sign in
    router.push('/signin')
    removeListeners()
  })
  
  verifyFailureListenerId = gameStore.addEventListener('verify_email_failure', (data) => {
    errorMessage.value = data || 'Verification failed. Please try again.'
    isVerifying.value = false
    // Clear code digits to allow retry
    codeDigits.value = ['', '', '', '', '', '']
    removeListeners()
    // Re-setup listeners for retry
    setupListeners()
  })
  
  resendSuccessListenerId = gameStore.addEventListener('resend_verification_success', () => {
    errorMessage.value = ''
    // Start cooldown timer
    startCooldown()
    removeListeners()
    // Re-setup listeners
    setupListeners()
  })
  
  resendFailureListenerId = gameStore.addEventListener('resend_verification_failure', (data) => {
    errorMessage.value = data || 'Failed to resend code. Please try again.'
    removeListeners()
    // Re-setup listeners
    setupListeners()
  })
}

// Cleanup event listeners
const removeListeners = () => {
  if (verifySuccessListenerId) {
    gameStore.removeEventListener('verify_email_success', verifySuccessListenerId)
    verifySuccessListenerId = null
  }
  if (verifyFailureListenerId) {
    gameStore.removeEventListener('verify_email_failure', verifyFailureListenerId)
    verifyFailureListenerId = null
  }
  if (resendSuccessListenerId) {
    gameStore.removeEventListener('resend_verification_success', resendSuccessListenerId)
    resendSuccessListenerId = null
  }
  if (resendFailureListenerId) {
    gameStore.removeEventListener('resend_verification_failure', resendFailureListenerId)
    resendFailureListenerId = null
  }
}

// Verify code
const verifyCode = async () => {
  errorMessage.value = ''
  isVerifying.value = true
  
  try {
    if (!gameStore.ws) {
      throw new Error('No WebSocket connection available')
    }
    
    const code = codeDigits.value.join('')
    
    const message = {
      type: 'verify_email',
      body: {
        email: email.value,
        code: code
      }
    }
    
    gameStore.ws.send(JSON.stringify(message))
  } catch (e: any) {
    errorMessage.value = e.message || 'An error occurred'
    isVerifying.value = false
  }
}

// Resend verification code
const resendCode = async () => {
  errorMessage.value = ''
  
  try {
    if (!gameStore.ws) {
      throw new Error('No WebSocket connection available')
    }
    
    const message = {
      type: 'resend_verification',
      body: {
        email: email.value
      }
    }
    
    gameStore.ws.send(JSON.stringify(message))
  } catch (e: any) {
    errorMessage.value = e.message || 'An error occurred'
  }
}

// Start 60-second cooldown timer
const startCooldown = () => {
  resendCooldown.value = 60
  
  if (cooldownInterval) {
    clearInterval(cooldownInterval)
  }
  
  cooldownInterval = window.setInterval(() => {
    resendCooldown.value--
    
    if (resendCooldown.value <= 0) {
      if (cooldownInterval) {
        clearInterval(cooldownInterval)
        cooldownInterval = null
      }
    }
  }, 1000)
}

// Utility functions
const openSourceCode = () => {
  window.open('https://github.com/kirodotdev/spirit-of-kiro/', '_blank')
}

const openGuide = () => {
  window.open('https://kiro.dev/docs/guides/learn-by-playing/', '_blank')
}

// Cleanup on unmount
onUnmounted(() => {
  removeListeners()
  
  if (cooldownInterval) {
    clearInterval(cooldownInterval)
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

.verification-frame {
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
}

/* Corner ornaments */
.verification-frame::before,
.verification-frame::after {
  content: '';
  position: absolute;
  width: 20px;
  height: 20px;
  border: 2px solid rgba(218, 165, 32, 0.6);
}

.verification-frame::before {
  top: 10px;
  left: 10px;
  border-right: none;
  border-bottom: none;
}

.verification-frame::after {
  bottom: 10px;
  right: 10px;
  border-left: none;
  border-top: none;
}

h1 {
  color: #e6d5ff;
  text-align: center;
  margin-bottom: 1rem;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 2rem;
}

.instruction-text {
  color: #b8a3d4;
  text-align: center;
  margin-bottom: 2rem;
  font-family: Georgia, 'Times New Roman', serif;
  line-height: 1.6;
}

.instruction-text strong {
  color: #e6d5ff;
}

.error-message {
  color: #ff4444;
  text-align: center;
  font-size: 0.9rem;
  margin-top: 1rem;
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

.resend-section {
  margin-top: 2rem;
  text-align: center;
  /* Ensure adequate spacing for touch */
  padding: 0.5rem 0;
}

.resend-button {
  background: transparent;
  border: 1px solid rgba(218, 165, 32, 0.5);
  color: rgba(218, 165, 32, 0.8);
  padding: 0.75rem 2rem;
  border-radius: 8px;
  font-size: 1rem;
  font-family: Georgia, 'Times New Roman', serif;
  cursor: pointer;
  transition: all 0.3s ease;
  /* iOS touch target guideline: minimum 44x44px */
  min-height: 44px;
  min-width: 44px;
}

.resend-button:hover:not(:disabled) {
  background: rgba(218, 165, 32, 0.1);
  border-color: rgba(218, 165, 32, 0.8);
}

.resend-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading-indicator {
  text-align: center;
  color: #b8a3d4;
  margin-top: 1rem;
  font-family: Georgia, 'Times New Roman', serif;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
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
  
  .verification-frame {
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
  
  .verification-frame {
    padding: 1.5rem 1rem;
    margin: 0;
    border-radius: 15px;
  }
  
  h1 {
    font-size: 1.5rem;
    margin-bottom: 0.75rem;
  }
  
  .instruction-text {
    font-size: 0.85rem;
    margin-bottom: 1.5rem;
    line-height: 1.5;
  }
  
  .resend-button {
    padding: 0.75rem 1.5rem;
    font-size: 0.9rem;
    width: 100%;
  }
  
  .back-link {
    font-size: 0.85rem;
    margin-bottom: 0.75rem;
  }
  
  .loading-indicator {
    font-size: 0.9rem;
  }
  
  .error-message {
    font-size: 0.85rem;
    padding: 0.6rem;
  }
}
</style>
