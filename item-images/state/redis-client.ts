import { createClient } from 'redis';
import { REDIS_CONFIG } from '../config';

console.log(`Connecting to redis://${REDIS_CONFIG.host}:${REDIS_CONFIG.port}`)

const redisClient = createClient({
    url: `redis://${REDIS_CONFIG.host}:${REDIS_CONFIG.port}`
});

redisClient.on('error', err => console.error('Redis Client Error', err));

// Connect to redis
await redisClient.connect();

export default redisClient;