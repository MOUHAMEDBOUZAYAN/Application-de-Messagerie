const Redis = require('ioredis');
const logger = require('../utils/logger');

let redisClient;

const connectRedis = async () => {
  try {
    redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

    redisClient.on('connect', () => {
      logger.info('Redis connecté');
    });

    redisClient.on('error', (err) => {
      logger.error('Erreur Redis:', err);
    });

    return redisClient;
  } catch (error) {
    logger.error('Erreur de connexion Redis:', error.message);
  }
};

const getRedisClient = () => {
  if (!redisClient) {
    throw new Error('Redis client non initialisé');
  }
  return redisClient;
};

module.exports = {
  connectRedis,
  getRedisClient
};


