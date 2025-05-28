import { readFileSync } from 'fs';

// Try to load environment variables from shared volume
let envConfig = {};
try {
  const envFile = readFileSync('/shared/.env', 'utf8');
  
  // Parse the .env file content
  envConfig = envFile.split('\n').reduce((acc, line) => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      // Remove surrounding quotes if they exist
      value = value.replace(/^['"]|['"]$/g, '');
      acc[key] = value;
    }
    return acc;
  }, {});
  
  console.log('Successfully loaded environment variables from /shared/.env');
} catch (error) {
  console.log('Could not load environment variables from /shared/.env, falling back to process.env');
  console.log(`Error details: ${error.message}`);
}

// Merge loaded config with process.env, with process.env taking precedence
const getEnv = (key) => {
  return process.env[key] || envConfig[key];
};

export const DYNAMODB_CONFIG = {
  // If we are passing a real table name then we are in a live environment,
  // just use the normal DynamoDB endpoint, otherwise use the local endpoint
  endpoint: getEnv('DYNAMODB_TABLE_ITEMS') ? undefined : 'http://localhost:8000',
  tables: {
    items: getEnv('DYNAMODB_TABLE_ITEMS') || 'Items',
    inventory: getEnv('DYNAMODB_TABLE_INVENTORY') || 'Inventory',
    location: getEnv('DYNAMODB_TABLE_LOCATION') || 'Location',
    users: getEnv('DYNAMODB_TABLE_USERS') || 'Users',
    usernames: getEnv('DYNAMODB_TABLE_USERNAMES') || 'Usernames',
    persona: getEnv('DYNAMODB_TABLE_PERSONA') || 'Persona'
  }
};

export const S3_CONFIG = {
  bucketName: getEnv('S3_BUCKET_NAME'),
};

export const CLOUDFRONT_CONFIG = {
  domain: getEnv('CLOUDFRONT_DOMAIN'),
};

export const REDIS_CONFIG = {
  host: getEnv('REDIS_HOST') || 'localhost',
  port: 6379
};

export const ITEM_IMAGES_SERVICE_CONFIG = {
  url: getEnv('ITEM_IMAGES_SERVICE_URL') || 'http://kiro-game-images-service-alb-559009974.us-west-2.elb.amazonaws.com',
};