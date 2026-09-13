import { Redis } from 'ioredis';

let redisClient = null;

export const getRedis = () => {
  if (redisClient) return redisClient;

  const redisOptions = {
    maxRetriesPerRequest: null, // required for BullMQ
    lazyConnect: true,
    retryStrategy: (times) => (times > 3 ? null : Math.min(times * 500, 2000)),
  };

  if (process.env.REDIS_URL) {
    redisClient = new Redis(process.env.REDIS_URL, redisOptions);
  } else {
    redisClient = new Redis({
      ...redisOptions,
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
    });
  }

  redisClient.on('connect', () => console.log('✅ Redis connected'));
  redisClient.on('error', (err) => {
    if (err.code === 'ECONNREFUSED') return;
    console.error('❌ Redis error:', err.message);
  });

  return redisClient;
};

export const getBullMQConnection = () => {
  if (process.env.REDIS_URL) {
    return {
      url: process.env.REDIS_URL,
      maxRetriesPerRequest: null,
      retryStrategy: (times) => (times > 2 ? null : 1000),
    };
  }

  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null,
    retryStrategy: (times) => (times > 2 ? null : 1000),
  };
};
