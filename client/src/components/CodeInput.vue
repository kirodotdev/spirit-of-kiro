<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';

// Props
interface Props {
  modelValue: string[];
  disabled?: boolean;
  autoFocus?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  autoFocus: true
});

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: string[]];
  'complete': [];
}>();

// Set up 6 input refs using ref array
const inputRefs = ref<(HTMLInputElement | null)[]>([]);

// Initialize input refs array
const setInputRef = (el: HTMLInputElement | null, index: number) => {
  if (el) {
    inputRefs.value[index] = el;
  }
};

// Auto-focus first field on mount if autoFocus is true
onMounted(() => {
  if (props.autoFocus && inputRefs.value[0]) {
    inputRefs.value[0].focus();
  }
});

// Watch for all digits filled to emit complete event
watch(() => props.modelValue, (newValue) => {
  const allFilled = newValue.every(digit => digit.length === 1);
  if (allFilled) {
    emit('complete');
  }
}, { deep: true });

// Handle digit input with auto-focus to next field
const handleInput = (event: Event, index: number) => {
  const input = event.target as HTMLInputElement;
  const value = input.value;
  
  // Restrict to numeric characters only (0-9)
  const numericValue = value.replace(/[^0-9]/g, '');
  
  // Update the model value
  const newValue = [...props.modelValue];
  newValue[index] = numericValue.slice(0, 1); // Only take first digit
  emit('update:modelValue', newValue);
  
  // Auto-focus to next field if digit entered
  if (numericValue.length === 1 && index < 5) {
    const nextInput = inputRefs.value[index + 1];
    if (nextInput) {
      nextInput.focus();
    }
  }
};

// Handle backspace to focus previous field
const handleKeyDown = (event: KeyboardEvent, index: number) => {
  const input = event.target as HTMLInputElement;
  
  // Handle backspace on empty field
  if (event.key === 'Backspace' && input.value === '' && index > 0) {
    event.preventDefault();
    const prevInput = inputRefs.value[index - 1];
    if (prevInput) {
      prevInput.focus();
      // Clear the previous field
      const newValue = [...props.modelValue];
      newValue[index - 1] = '';
      emit('update:modelValue', newValue);
    }
  }
};

// Handle paste to distribute code across all fields
const handlePaste = (event: ClipboardEvent, index: number) => {
  event.preventDefault();
  
  const pastedData = event.clipboardData?.getData('text') || '';
  const numericData = pastedData.replace(/[^0-9]/g, '');
  
  if (numericData.length > 0) {
    const newValue = [...props.modelValue];
    
    // Distribute digits across fields starting from current index
    for (let i = 0; i < numericData.length && (index + i) < 6; i++) {
      newValue[index + i] = numericData[i];
    }
    
    emit('update:modelValue', newValue);
    
    // Focus the next empty field or the last field
    const nextEmptyIndex = newValue.findIndex((digit, i) => i >= index && digit === '');
    if (nextEmptyIndex !== -1 && inputRefs.value[nextEmptyIndex]) {
      inputRefs.value[nextEmptyIndex]?.focus();
    } else if (inputRefs.value[5]) {
      inputRefs.value[5]?.focus();
    }
  }
};
</script>

<template>
  <div class="code-input-container">
    <input
      v-for="(digit, index) in modelValue"
      :key="index"
      :ref="(el) => setInputRef(el as HTMLInputElement, index)"
      type="text"
      inputmode="numeric"
      autocomplete="one-time-code"
      maxlength="1"
      class="code-digit"
      :value="digit"
      :disabled="disabled"
      :aria-label="`Verification code digit ${index + 1}`"
      @input="handleInput($event, index)"
      @keydown="handleKeyDown($event, index)"
      @paste="handlePaste($event, index)"
    />
  </div>
</template>

<style scoped>
.code-input-container {
  display: flex;
  gap: 8px;
  justify-content: center;
  align-items: center;
}

.code-digit {
  width: 50px;
  height: 60px;
  text-align: center;
  font-size: 24px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  border: 2px solid rgba(138, 43, 226, 0.3);
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.3);
  color: #e6d5ff;
  transition: all 0.3s ease;
}

.code-digit:focus {
  outline: none;
  border-color: rgba(218, 165, 32, 0.8);
  box-shadow: 0 0 10px rgba(218, 165, 32, 0.3);
  background: rgba(0, 0, 0, 0.5);
}

.code-digit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Tablet optimization */
@media (max-width: 768px) {
  .code-digit {
    width: 48px;
    height: 56px;
    font-size: 22px;
  }
  
  .code-input-container {
    gap: 8px;
  }
}

/* Mobile optimization - minimum touch target size (44x44px iOS guideline) */
@media (max-width: 480px) {
  .code-digit {
    width: 44px;
    height: 50px;
    font-size: 20px;
    min-width: 44px;
    min-height: 44px;
  }
  
  .code-input-container {
    gap: 6px;
    /* Ensure adequate spacing for touch */
    padding: 0.5rem 0;
  }
}

/* Prevent zoom on focus for iOS - font-size must be at least 16px */
@media (max-width: 768px) {
  .code-digit {
    font-size: max(16px, 20px);
  }
}
</style>
