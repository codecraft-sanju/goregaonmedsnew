//src/config/redis.js
import Redis from 'ioredis';
import { loadEnv } from './env.js';

const env = loadEnv();

export const redisClient = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 1, 
  enableReadyCheck: false,
  retryStrategy(times) {
    return Math.min(times * 50, 2000);
  }
});

redisClient.on('error', (err) => console.error('[redis] Standard Client Error:', err.message));
redisClient.on('connect', () => console.log('[redis] Standard Client Connected successfully'));

export const redisQueueClient = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3, 
});

redisQueueClient.on('error', (err) => console.error('[redis] Queue Producer Client Error:', err.message));

export function createWorkerConnection() {
  const workerClient = new Redis(env.REDIS_URL, { 
    maxRetriesPerRequest: null 
  });
  workerClient.on('error', (err) => console.error('[redis] Worker Client Error:', err.message));
  return workerClient;
}