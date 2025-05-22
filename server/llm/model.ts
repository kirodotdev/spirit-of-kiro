import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';

// Initialize the Bedrock client
const bedrockClient = new BedrockRuntimeClient({
  region: 'us-east-1', // Update with your preferred AWS region
});

export const invoke = async (prompt: object): Promise<string | undefined> => {
  try {
    // Create the command to converse with the model
    const command = new ConverseCommand({
      //modelId: 'us.amazon.nova-pro-v1:0', 
      //modelId: 'us.anthropic.claude-3-7-sonnet-20250219-v1:0', 
      //modelId: 'us.anthropic.claude-3-5-haiku-20241022-v1:0',
      modelId: 'us.anthropic.claude-sonnet-4-20250514-v1:0',
      ...prompt
    });

    // Invoke the model using Converse API
    const response = await bedrockClient.send(command);
    
    // Extract the response text
    const output = response.output?.message?.content?.[0]?.text;
    
    console.log(`LLM - Latency: ${response.metrics?.latencyMs} Cache: ${response.usage?.cacheReadInputTokens} In: ${response.usage?.inputTokens} Out: ${response.usage?.outputTokens}`);
    return output;
  } catch (err) {
    console.error(err);
    return undefined;
  }
};