import { readFileSync } from 'fs';

const ENV = process.env.ENVIRONMENT || 'prod'
const FILENAME=`${ENV}.env`;

// Try to load environment variables from shared volume
let envConfig = {};
try {
  const envFile = readFileSync(FILENAME, 'utf8');
  
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
  
  console.log(`Successfully loaded environment variables from ${FILENAME}`);
} catch (error) {
  console.log(`Could not load environment variables from ${FILENAME}, falling back to process.env`);
  console.log(`Error details: ${error.message}`);
}

// Merge loaded config with process.env, with process.env taking precedence
const getEnv = (key) => {
  return process.env[key] || envConfig[key];
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