require('dotenv').config();

module.exports = {
  // Configuration du serveur
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // URLs
  clientURL: process.env.CLIENT_URL || 'http://localhost:3000',
  mongoURI: process.env.MONGO_URI || 'mongodb://localhost:27017/messagerie',
  redisURL: process.env.REDIS_URL || 'redis://localhost:6379',
  
  // JWT
  jwtSecret: process.env.JWT_SECRET || 'votre_secret_jwt_super_securise',
  jwtExpiration: process.env.JWT_EXPIRATION || '24h',
  
  // Rate Limiting
  rateLimitWindow: process.env.RATE_LIMIT_WINDOW || 15 * 60 * 1000, // 15 minutes
  rateLimitMax: process.env.RATE_LIMIT_MAX || 100,
  
  // Socket.IO
  socketPingTimeout: process.env.SOCKET_PING_TIMEOUT || 60000,
  socketPingInterval: process.env.SOCKET_PING_INTERVAL || 25000,
  
  // Redis Cache
  cacheTTL: process.env.CACHE_TTL || 3600, // 1 heure
  
  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
  
  // Security
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(','),
  
  // PM2
  pm2Instances: process.env.PM2_INSTANCES || 'max',
  pm2ExecMode: process.env.PM2_EXEC_MODE || 'cluster'
}; 