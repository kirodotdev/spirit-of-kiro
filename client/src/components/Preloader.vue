<template>
  <div class="preloader-container">
    <!-- Preload all static assets by rendering them with visibility: hidden -->
    <img 
      v-for="(asset, index) in staticAssetUrls" 
      :key="index" 
      :src="asset" 
      class="preloaded-image" 
      alt="Preloaded asset"
    />
  </div>
</template>

<script setup lang="ts">
import { staticAssets } from '../assets'

// Extract all static asset URLs into an array
const staticAssetUrls = Object.values(staticAssets)
</script>

<style scoped>
.preloader-container {
  position: absolute;
  width: 0;
  height: 0;
  overflow: hidden;
  opacity: 0;
  pointer-events: none;
}

.preloaded-image {
  position: absolute;
  width: 1px;
  height: 1px;
  visibility: hidden;
}
</style>