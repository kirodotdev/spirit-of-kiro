/**
 * Vector Store implementation using Redis and AWS Bedrock Titan Embeddings
 * 
 * This module provides functionality to:
 * 1. Generate embeddings from text using AWS Bedrock Titan model
 * 2. Store key-value pairs in Redis with vector search capabilities
 * 3. Find nearest matches for input keys using vector similarity
 */

import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import redisClient from './redis-client';
import { randomUUID } from 'node:crypto';

// Constants
const VECTOR_INDEX = 'vector_index';
const VECTOR_DIM = 256; // Titan embeddings dimension
const TITAN_MODEL_ID = 'amazon.titan-embed-text-v2:0';

// Initialize Bedrock client
const bedrockRuntime = new BedrockRuntimeClient({ region: "us-east-1" });

const float32Buffer = (arr) => {
  const floatArray = new Float32Array(arr);
  const float32Buffer = Buffer.from(floatArray.buffer);
  return float32Buffer;
};

/**
 * Ensures the vector index exists in Redis
 * Creates the index if it doesn't exist
 * 
 * @returns Promise<boolean> - True if index exists or was created successfully
 */
let checkedIndex = false;
async function ensureVectorIndex(): Promise<boolean> {
  if (checkedIndex == true) {
    return true;
  }

  try {
    // Check if index exists
    const indices = await redisClient.sendCommand(['FT._LIST']);
    if (indices.includes(VECTOR_INDEX)) {
      return true;
    }

    // Create vector index with COSINE distance metric
    await redisClient.sendCommand([
      'FT.CREATE', VECTOR_INDEX,
      'ON', 'HASH', 'PREFIX', '1', 'vector:',
      'SCHEMA',
        'vector', 'VECTOR', 'HNSW', '6', 'TYPE', 'FLOAT32', 'DIM', VECTOR_DIM.toString(), 'DISTANCE_METRIC', 'COSINE',
        'value', 'TEXT',
        'key_text', 'TEXT',
        'metadata', 'TEXT',
        'createdAt', 'TEXT'
    ]);

    checkedIndex = true;
    
    console.log('Vector index created successfully');
    return true;
  } catch (error) {
    console.error('Error creating vector index:', error);
    return false;
  }
}

/**
 * Generates text embeddings using AWS Bedrock Titan model
 * 
 * @param text - Input text to generate embeddings for
 * @returns Promise<number[]> - Vector representation of the input text
 * @throws Error if embedding generation fails
 */
async function generateEmbeddings(text: string): Promise<number[]> {
  try {
    const params = {
      modelId: TITAN_MODEL_ID,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        inputText: text,
        dimensions: VECTOR_DIM
      })
    };

    const command = new InvokeModelCommand(params);
    const response = await bedrockRuntime.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    if (!responseBody.embedding || !Array.isArray(responseBody.embedding)) {
      throw new Error('Invalid embedding response from Bedrock');
    }
    
    return responseBody.embedding;
  } catch (error) {
    console.error('Error generating embeddings:', error);
    throw new Error(`Failed to generate embeddings: ${error.message}`);
  }
}

/**
 * Stores a key-value pair in the vector store
 * Uses Bedrock Titan embeddings to generate a vector representation of the key
 * 
 * @param inputKey - Key to store (will be converted to vector representation)
 * @param inputValue - Value to associate with the key
 * @param metadata - Optional metadata to store with the key-value pair
 * @returns Promise<string> - ID of the stored vector entry
 */
export async function storeKeyValue(
  inputKey: string,
  inputValue: string,
  metadata?: Record<string, any>
): Promise<string> {
  try {
    // Ensure vector index exists
    const indexExists = await ensureVectorIndex();
    if (!indexExists) {
      throw new Error('Failed to ensure vector index exists');
    }
    
    // Generate embeddings for the input key
    const vector = await generateEmbeddings(inputKey);
    
    // Generate a unique ID for this entry
    const id = randomUUID();
    
    // Store vector data in Redis
    await redisClient.hSet(`vector:${id}`, {
      vector: Buffer.from(new Float32Array(vector).buffer),
      value: inputValue,
      key_text: inputKey,
      metadata: metadata ? JSON.stringify(metadata) : '{}',
      createdAt: new Date().toISOString()
    });
    
    console.log(`Stored key-value pair with ID: ${id}`);
    return id;
  } catch (error) {
    console.error('Error storing key-value pair:', error);
    throw new Error(`Failed to store key-value pair: ${error.message}`);
  }
}

/**
 * Finds the nearest match for an input key in the vector store
 * Uses Bedrock Titan embeddings to generate a vector representation of the key
 * 
 * @param inputKey - Key to find nearest match for
 * @param limit - Maximum number of results to return (default: 1)
 * @returns Promise<VectorSearchResult | null> - Nearest match or null if no match found
 */
export async function nearestMatch(
  inputKey: string,
  limit: number = 1
): Promise<any> {
  try {
    console.log('Ensure index exists');

    // Ensure vector index exists
    const indexExists = await ensureVectorIndex();
    if (!indexExists) {
      throw new Error('Failed to ensure vector index exists');
    }
    
    // Generate embeddings for the input key
    const vector = await generateEmbeddings(inputKey);
    
    // Perform vector search in Redis
    const searchQuery = `*=>[KNN 1 @vector $query_vector AS score]`;
    const results = await redisClient.ft.search(VECTOR_INDEX, searchQuery, {
      PARAMS: {
        query_vector: float32Buffer(vector)
      },
      RETURN: ['score', 'value', 'key_text'],
      SORTBY: {
        BY: 'score'
      }
    })

    if (!results) {
      return;
    }

    if (results && results.total == 0) {
      return;
    }

    if (!results.documents) {
      return;
    }

    return results.documents[0];
    
    /*if (!results || results.length <= 1) {
      return null;
    }
    
    // Parse results
    const totalResults = results[0] as number;
    if (totalResults === 0) {
      return null;
    }
    
    // Get the first (closest) result
    const id = (results[1] as string).replace('vector:', '');
    const fields = results[2] as string[];
    
    // Extract fields
    const value = fields[fields.indexOf('value') + 1] as string;
    const score = parseFloat(fields[fields.indexOf('score') + 1] as string);
    const metadataStr = fields[fields.indexOf('metadata') + 1] as string;
    
    return {
      id,
      score,
      value,
      metadata: metadataStr ? JSON.parse(metadataStr) : undefined
    };*/
  } catch (error) {
    console.error('Error finding nearest match:', error);
    throw new Error(`Failed to find nearest match: ${error.message}`);
  }
}

/**
 * Deletes a vector entry by ID
 * 
 * @param id - Vector entry ID
 * @returns Promise<boolean> - True if successful
 */
export async function deleteVector(id: string): Promise<boolean> {
  try {
    await redisClient.del(`vector:${id}`);
    return true;
  } catch (error) {
    console.error('Error deleting vector:', error);
    return false;
  }
}