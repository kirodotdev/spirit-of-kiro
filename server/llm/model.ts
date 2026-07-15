import { BedrockRuntimeClient, ConverseCommand, ConverseStreamCommand } from '@aws-sdk/client-bedrock-runtime';

// Initialize the Bedrock client
const bedrockClient = new BedrockRuntimeClient({
  region: 'us-west-2', // Update with your preferred AWS region
});

// Model fallback configuration
type ModelId = 'us.anthropic.claude-sonnet-5' | 'us.amazon.nova-pro-v1:0';
const MODELS: ModelId[] = [
  // Primary: latest Claude Sonnet. Fallback: Nova Pro. The failover logic below
  // also covers the case where Sonnet access has not yet been granted.
  'us.anthropic.claude-sonnet-5',
  'us.amazon.nova-pro-v1:0'
];

// Track model fallback state
const modelFallbackState = new Map<ModelId, number>();

const isModelInCooldown = (modelId: ModelId): boolean => {
  const lastFallback = modelFallbackState.get(modelId);
  if (!lastFallback) return false;
  return Date.now() - lastFallback < 5 * 60 * 1000; // 5 minutes in milliseconds
};

const getNextAvailableModel = (currentModelId: ModelId): ModelId | undefined => {
  const currentIndex = MODELS.indexOf(currentModelId);
  if (currentIndex === -1) return undefined;
  
  // Try next models in sequence
  for (let i = 1; i < MODELS.length; i++) {
    const nextModel = MODELS[(currentIndex + i) % MODELS.length];
    if (!isModelInCooldown(nextModel)) {
      return nextModel;
    }
  }
  return undefined;
};

const getFirstAvailableModel = (): ModelId | undefined => {
  for (const modelId of MODELS) {
    if (!isModelInCooldown(modelId)) {
      return modelId;
    }
  }
  return undefined;
};

// Non-streaming invoke function (kept for backward compatibility)
export const invoke = async (prompt: object): Promise<string | undefined> => {
  let currentModelId = getFirstAvailableModel();
  if (!currentModelId) {
    console.error('No available models - all are in cooldown');
    return undefined;
  }
  
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    try {
      // Create the command to converse with the model
      const command = new ConverseCommand({
        modelId: currentModelId,
        ...prompt
      });

      // Invoke the model using Converse API
      const response = await bedrockClient.send(command);
      
      // Extract the response text. Some models (e.g. Claude Sonnet 5 with
      // extended thinking) return a reasoningContent block before the text
      // block, so select text blocks rather than assuming index 0.
      const output = response.output?.message?.content
        ?.filter((b: any) => typeof b?.text === 'string')
        .map((b: any) => b.text)
        .join('');
      
      console.log(`LLM - Model: ${currentModelId} Latency: ${response.metrics?.latencyMs} Cache: ${response.usage?.cacheReadInputTokens} In: ${response.usage?.inputTokens} Out: ${response.usage?.outputTokens}`);
      return output;
    } catch (err: any) {
      console.error(`Error with model ${currentModelId}:`, err);
      
      // Fail over on throttling OR when the current model is unavailable
      // (legacy/EOL, access not granted, or invalid model id).
      const isFailover =
        err.name === 'ThrottlingException' ||
        err.name === 'ResourceNotFoundException' ||
        err.name === 'AccessDeniedException';
      if (isFailover) {
        // Mark current model as in cooldown
        modelFallbackState.set(currentModelId, Date.now());
        
        // Try to get next available model
        const nextModel = getNextAvailableModel(currentModelId);
        if (nextModel) {
          console.log(`Switching to fallback model: ${nextModel}`);
          currentModelId = nextModel;
          attempts++;
          continue;
        }
      }
      
      // If we've exhausted all attempts or it's not a throttling error
      if (attempts >= maxAttempts - 1 || !isFailover) {
        return undefined;
      }
      
      attempts++;
    }
  }
  
  return undefined;
};

// New streaming invoke function
export const invokeStream = async (
  prompt: object, 
  onChunk: (chunk: string) => void,
  onComplete?: (fullResponse: string) => void
): Promise<void> => {
  let currentModelId = getFirstAvailableModel();
  if (!currentModelId) {
    console.error('No available models - all are in cooldown');
    return;
  }
  
  let attempts = 0;
  const maxAttempts = 3;
  let fullResponse = '';

  while (attempts < maxAttempts) {
    try {
      // Create the command to converse with the model in streaming mode
      const command = new ConverseStreamCommand({
        modelId: currentModelId,
        ...prompt
      });

      // Invoke the model using ConverseStream API
      const response = await bedrockClient.send(command);
      
      // Process the streaming response
      for await (const chunk of response.stream || []) {
        if (chunk.contentBlockDelta) {
          const textChunk = chunk.contentBlockDelta.delta?.text || "";
          fullResponse += textChunk;
          onChunk(textChunk);
        }
      }
      
      // Call the completion callback with the full response if provided
      if (onComplete) {
        onComplete(fullResponse);
      }
      
      console.log(`LLM Stream - Model: ${currentModelId}`);
      return;
    } catch (err: any) {
      console.error(`Error with streaming model ${currentModelId}:`, err);
      
      // Fail over on throttling OR when the current model is unavailable
      // (legacy/EOL, access not granted, or invalid model id).
      const isFailover =
        err.name === 'ThrottlingException' ||
        err.name === 'ResourceNotFoundException' ||
        err.name === 'AccessDeniedException';
      if (isFailover) {
        // Mark current model as in cooldown
        modelFallbackState.set(currentModelId, Date.now());
        
        // Try to get next available model
        const nextModel = getNextAvailableModel(currentModelId);
        if (nextModel) {
          console.log(`Switching to fallback model: ${nextModel}`);
          currentModelId = nextModel;
          attempts++;
          continue;
        }
      }
      
      // If we've exhausted all attempts or it's not a throttling error
      if (attempts >= maxAttempts - 1 || !isFailover) {
        return;
      }
      
      attempts++;
    }
  }
};