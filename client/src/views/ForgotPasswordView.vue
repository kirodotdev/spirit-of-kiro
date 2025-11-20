<template>
  <div class="auth-screen">
    <!-- Floating particles for mystical effect -->
    <FloatingParticles :count="20" />
    
    <div class="utility-buttons-top">
      <button class="source-button" @click="openSourceCode">Source</button>
      <button class="guide-button" @click="openGuide">Guide</button>
    </div>
    <div class="auth-wrapper">
      <router-link to="/signin" class="back-link">← Back to Sign In</router-link>
      <div class="reset-frame">
        <!-- Step 1: Request reset code -->
        <div v-if="step === 1" class="step-container">
          <h1>Reset Your Password</h1>
          <p class="instruction-text">
            Enter your email address and we'll send you a code to reset your password.
          </p>

          <form @submit.prevent="sendResetCode" class="reset-form">
            <div class="form-group">
              <label for="email">Email Address</label>
              <input
                type="email"
                id="email"
                v-model="email"
                required
                autocomplete="email"
                inputmode="email"
                :disabled="isSending"
                placeholder="your@email.com"
              />
            </div>

            <div v-if="errorMessage" class="error-message">
              {{ errorMessage }}
            </div>

            <button type="submit" class="submit-button" :disabled="isSending">
              {{ isSending ? 'Sending...' : 'Send Reset Code' }}
            </button>
          </form>
        </div>

        <!-- Step 2: Reset password with code -->
        <div v-if="step === 2" class="step-container">
          <h1>Enter Reset Code</h1>
          <p class="instruction-text">
            We've sent a 6-digit code to<br />
            <strong>{{ email }}</strong>
          </p>

          <CodeInput
            v-model="codeDigits"
            :disabled="isResetting"
          />

          <form @submit.prevent="resetPassword" class="reset-form">
            <div class="form-group">
              <label for="newPassword">New Password</label>
              <input
                type="password"
                id="newPassword"
                v-model="newPassword"
                required
                autocomplete="new-password"
                inputmode="text"
                :disabled="isResetting"
                placeholder="Enter new password"
              />
              <div class="password-requirements">
                <div :class="{ 'requirement-met': hasMinLength }">
                  ✓ At least 8 characters
                </div>
                <div :class="{ 'requirement-met': hasUppercase }">
                  ✓ One uppercase letter
                </div>
                <div :class="{ 'requirement-met': hasLowercase }">
                  ✓ One lowercase letter
                </div>
                <div :class="{ 'requirement-met': hasNumber }">
                  ✓ One number
                </div>
              </div>
            </div>

            <div class="form-group">
              <label for="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                v-model="confirmPassword"
                required
                autocomplete="new-password"
                inputmode="text"
                :disabled="isResetting"
                placeholder="Confirm new password"
              />
              <div v-if="confirmPassword && !passwordsMatch" class="password-mismatch">
                Passwords do not match
              </div>
            </div>

            <div v-if="errorMessage" class="error-message">
              {{ errorMessage }}
            </div>

            <button
              type="submit"
              class="submit-button"
              :disabled="isResetting || !isFormValid"
            >
              {{ isResetting ? 'Resetting...' : 'Reset Password' }}
            </button>

            <div class="resend-section">
              <button
                type="button"
                class="resend-button"
                :disabled="isResetting"
                @click="resendResetCode"
              >
                Resend Code
              </button>
            </div>
          </form>
        </div>

        <!-- Step 3: Success message -->
        <div v-if="step === 3" class="step-container success-container">
          <div class="success-icon">✓</div>
          <h1>Password Reset Successful!</h1>
          <p class="instruction-text">
            Your password has been successfully reset.<br />
            You can now sign in with your new password.
          </p>

          <router-link to="/signin" class="submit-button">
            Go to Sign In
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '../stores/game'
import CodeInput from '../components/CodeInput.vue'
import FloatingParticles from '../components/FloatingParticles.vue'

const router = useRouter()
const gameStore = useGameStore()

// Component state
const step = ref<1 | 2 | 3>(1)
const email = ref('')
const codeDigits = ref<string[]>(['', '', '', '', '', ''])
const newPassword = ref('')
const confirmPassword = ref('')
const isSending = ref(false)
const isResetting = ref(false)
const errorMessage = ref('')

// Store listener IDs
let forgotPasswordSuccessId: string | null = null
let forgotPasswordFailureId: string | null = null
let confirmForgotPasswordSuccessId: string | null = null
let confirmForgotPasswordFailureId: string | null = null

// Password validation computed properties
const hasMinLength = computed(() => newPassword.value.length >= 8)
const hasUppercase = computed(() => /[A-Z]/.test(newPassword.value))
const hasLowercase = computed(() => /[a-z]/.test(newPassword.value))
const hasNumber = computed(() => /[0-9]/.test(newPassword.value))
const passwordsMatch = computed(() => newPassword.value === confirmPassword.value)

const isPasswordValid = computed(() => {
  return hasMinLength.value && hasUppercase.value && hasLowercase.value && hasNumber.value
})

const isCodeComplete = computed(() => {
  return codeDigits.value.every(digit => digit.length === 1)
})

const isFormValid = computed(() => {
  return isCodeComplete.value && isPasswordValid.value && passwordsMatch.value
})

// Setup event listeners
const setupListeners = () => {
  // Remove any existing listeners first
  removeListeners()
  
  // Step 1 listeners
  forgotPasswordSuccessId = gameStore.addEventListener('forgot_password_success', () => {
    errorMessage.value = ''
    isSending.value = false
    step.value = 2
    removeListeners()
    setupListeners()
  })
  
  forgotPasswordFailureId = gameStore.addEventListener('forgot_password_failure', (data) => {
    errorMessage.value = data || 'Failed to send reset code. Please try again.'
    isSending.value = false
    removeListeners()
    setupListeners()
  })
  
  // Step 2 listeners
  confirmForgotPasswordSuccessId = gameStore.addEventListener('confirm_forgot_password_success', () => {
    errorMessage.value = ''
    isResetting.value = false
    // Clear sensitive data
    newPassword.value = ''
    confirmPassword.value = ''
    codeDigits.value = ['', '', '', '', '', '']
    step.value = 3
    removeListeners()
  })
  
  confirmForgotPasswordFailureId = gameStore.addEventListener('confirm_forgot_password_failure', (data) => {
    errorMessage.value = data || 'Failed to reset password. Please try again.'
    isResetting.value = false
    // Clear code digits to allow retry
    codeDigits.value = ['', '', '', '', '', '']
    removeListeners()
    setupListeners()
  })
}

// Cleanup event listeners
const removeListeners = () => {
  if (forgotPasswordSuccessId) {
    gameStore.removeEventListener('forgot_password_success', forgotPasswordSuccessId)
    forgotPasswordSuccessId = null
  }
  if (forgotPasswordFailureId) {
    gameStore.removeEventListener('forgot_password_failure', forgotPasswordFailureId)
    forgotPasswordFailureId = null
  }
  if (confirmForgotPasswordSuccessId) {
    gameStore.removeEventListener('confirm_forgot_password_success', confirmForgotPasswordSuccessId)
    confirmForgotPasswordSuccessId = null
  }
  if (confirmForgotPasswordFailureId) {
    gameStore.removeEventListener('confirm_forgot_password_failure', confirmForgotPasswordFailureId)
    confirmForgotPasswordFailureId = null
  }
}

// Step 1: Send reset code
const sendResetCode = async () => {
  errorMessage.value = ''
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email.value)) {
    errorMessage.value = 'Please enter a valid email address.'
    return
  }
  
  isSending.value = true
  
  try {
    if (!gameStore.ws) {
      throw new Error('No WebSocket connection available')
    }
    
    const message = {
      type: 'forgot_password',
      body: {
        email: email.value
      }
    }
    
    gameStore.ws.send(JSON.stringify(message))
  } catch (e: any) {
    errorMessage.value = e.message || 'An error occurred'
    isSending.value = false
  }
}

// Step 2: Reset password with code
const resetPassword = async () => {
  errorMessage.value = ''
  
  // Validate form
  if (!isFormValid.value) {
    errorMessage.value = 'Please complete all fields correctly.'
    return
  }
  
  isResetting.value = true
  
  try {
    if (!gameStore.ws) {
      throw new Error('No WebSocket connection available')
    }
    
    const code = codeDigits.value.join('')
    
    const message = {
      type: 'confirm_forgot_password',
      body: {
        email: email.value,
        code: code,
        newPassword: newPassword.value
      }
    }
    
    gameStore.ws.send(JSON.stringify(message))
  } catch (e: any) {
    errorMessage.value = e.message || 'An error occurred'
    isResetting.value = false
  }
}

// Resend reset code
const resendResetCode = async () => {
  errorMessage.value = ''
  
  try {
    if (!gameStore.ws) {
      throw new Error('No WebSocket connection available')
    }
    
    const message = {
      type: 'forgot_password',
      body: {
        email: email.value
      }
    }
    
    gameStore.ws.send(JSON.stringify(message))
  } catch (e: any) {
    errorMessage.value = e.message || 'An error occurred'
  }
}

// Utility functions
const openSourceCode = () => {
  window.open('https://github.com/kirodotdev/spirit-of-kiro/', '_blank')
}

const openGuide = () => {
  window.open('https://kiro.dev/docs/guides/learn-by-playing/', '_blank')
}

// Lifecycle hooks
onMounted(() => {
  setupListeners()
})

onUnmounted(() => {
  removeListeners()
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

.reset-frame {
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
  min-height: 400px;
}

/* Corner ornaments */
.reset-frame::before,
.reset-frame::after {
  content: '';
  position: absolute;
  width: 20px;
  height: 20px;
  border: 2px solid rgba(218, 165, 32, 0.6);
}

.reset-frame::before {
  top: 10px;
  left: 10px;
  border-right: none;
  border-bottom: none;
}

.reset-frame::after {
  bottom: 10px;
  right: 10px;
  border-left: none;
  border-top: none;
}

.step-container {
  animation: fadeIn 0.5s ease-in-out;
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

.reset-form {
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
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  transition: all 0.3s ease;
  min-height: 44px;
}

input:focus {
  outline: none;
  border-color: rgba(218, 165, 32, 0.8);
  box-shadow: 0 0 10px rgba(218, 165, 32, 0.3);
  background: rgba(0, 0, 0, 0.5);
}

input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

input::placeholder {
  color: rgba(184, 163, 212, 0.5);
}

.password-requirements {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.85rem;
  color: #b8a3d4;
  margin-top: 0.5rem;
}

.password-requirements div {
  transition: color 0.3s ease;
}

.requirement-met {
  color: #4CAF50;
}

.password-mismatch {
  color: #ff4444;
  font-size: 0.85rem;
  margin-top: 0.25rem;
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
  text-decoration: none;
  display: inline-block;
  text-align: center;
  /* iOS touch target guideline: minimum 44x44px */
  min-height: 44px;
  min-width: 44px;
  /* Ensure adequate spacing between buttons */
  margin: 0.25rem 0;
}

.submit-button:hover:not(:disabled) {
  background: linear-gradient(135deg, 
    rgba(138, 43, 226, 1) 0%, 
    rgba(138, 43, 226, 0.8) 100%
  );
  box-shadow: 0 0 20px rgba(138, 43, 226, 0.5);
  transform: translateY(-2px);
}

.submit-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.resend-section {
  text-align: center;
  margin-top: 1rem;
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

/* Success container styling */
.success-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  padding: 2rem 0;
}

.success-icon {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, 
    rgba(76, 175, 80, 0.3) 0%, 
    rgba(76, 175, 80, 0.1) 100%
  );
  border: 3px solid rgba(76, 175, 80, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
  color: #4CAF50;
  animation: successPulse 2s ease-in-out infinite;
}

@keyframes successPulse {
  0%, 100% {
    box-shadow: 0 0 10px rgba(76, 175, 80, 0.3);
  }
  50% {
    box-shadow: 0 0 30px rgba(76, 175, 80, 0.6);
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
  
  .reset-frame {
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
  
  .reset-frame {
    padding: 1.5rem 1rem;
    margin: 0;
    border-radius: 15px;
    min-height: auto;
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
  
  .reset-form {
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
  
  .password-requirements {
    font-size: 0.8rem;
    gap: 0.2rem;
  }
  
  .password-mismatch {
    font-size: 0.8rem;
  }
  
  .submit-button,
  .resend-button {
    padding: 0.75rem 1.5rem;
    font-size: 0.9rem;
    width: 100%;
  }
  
  .back-link {
    font-size: 0.85rem;
    margin-bottom: 0.75rem;
  }
  
  .error-message {
    font-size: 0.85rem;
    padding: 0.6rem;
  }
  
  .success-icon {
    width: 60px;
    height: 60px;
    font-size: 2rem;
  }
  
  .success-container {
    gap: 1.25rem;
    padding: 1.5rem 0;
  }
}
</style>
