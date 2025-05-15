#!/usr/bin/env bun

import fetch from 'node-fetch';
import { randomInspiration } from '../../server/llm/word-lists/index.js';

// Configuration
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3001';
const NUM_IMAGES = process.env.NUM_IMAGES ? parseInt(process.env.NUM_IMAGES) : 5;

async function generateImage(description) {
  try {
    const url = `${SERVER_URL}/image?description=${encodeURIComponent(description)}`;
    console.log(`Generating image for: ${description}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`✅ Generated image: ${data.imageUrl}`);
    return data;
  } catch (error) {
    console.error(`❌ Error generating image for "${description}":`, error.message);
    return null;
  }
}

async function main() {
  console.log(`Generating ${NUM_IMAGES} random images...`);
  
  const results = [];
  
  for (let i = 0; i < NUM_IMAGES; i++) {
    const description = randomInspiration();
    const result = await generateImage(description);
    
    if (result) {
      results.push(result);
    }
    
    // Add a small delay between requests
    if (i < NUM_IMAGES - 1) {
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  console.log('\nSummary:');
  console.log(`Total images requested: ${NUM_IMAGES}`);
  console.log(`Successfully generated: ${results.length}`);
  console.log(`Failed: ${NUM_IMAGES - results.length}`);
}

main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});