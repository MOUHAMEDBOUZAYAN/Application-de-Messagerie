const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const Redis = require('ioredis');
const config = require('./config/config');
const logger = require('./utils/logger');
const socketHandler = require('./Socket/SocketHandler');

// Initialisation de l'application Express
const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: config.clientURL,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Configuration Redis (optionnel)
let redis = null;
const initRedis = async () => {
  try {
    logger.info('Tentative de connexion à Redis...');
    redis = new Redis(config.redisURL, {
      retryStrategy: (times) => {
        if (times > 3) {
          logger.warn('Redis non disponible après plusieurs tentatives');
          return null; // Arrêter les tentatives
        }
        return Math.min(times * 1000, 3000); // Retry avec délai croissant
      }
    });

    redis.on('error', (err) => {
      logger.warn('Redis non disponible:', err.message);
      redis = null;
    });

    redis.on('connect', () => {
      logger.info('Connecté à Redis');
    });

    return redis;
  } catch (error) {
    logger.warn('Redis non disponible:', error.message);
    return null;
  }
};

// Middleware de sécurité
app.use(helmet());
app.use(cors({
  origin: config.clientURL,
  credentials: true
}));
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limite chaque IP à 100 requêtes par fenêtre
});
app.use(limiter);

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/rooms', require('./routes/rooms'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/users', require('./routes/users'));

// Route de test
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// Gestion des erreurs
app.use((err, req, res, next) => {
  logger.error('Erreur serveur:', err);
  res.status(500).json({
    status: 'error',
    message: 'Une erreur est survenue sur le serveur',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Fonction de démarrage du serveur
const startServer = async () => {
  try {
    logger.info('Démarrage du serveur...');
    
    // Connexion à MongoDB
    logger.info('Tentative de connexion à MongoDB...');
    await mongoose.connect(config.mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    logger.info('Connecté à MongoDB');

    // Initialisation de Redis
    await initRedis();

    // Initialisation de Socket.IO
    logger.info('Initialisation de Socket.IO...');
    socketHandler(io);
    logger.info('Socket.IO initialisé');

    // Démarrage du serveur
    const PORT = config.port || 3000;
    server.listen(PORT, () => {
      logger.info(`Serveur démarré sur le port ${PORT}`);
      logger.info(`URL du client: ${config.clientURL}`);
      logger.info(`Environnement: ${config.nodeEnv}`);
    });

  } catch (error) {
    logger.error('Erreur lors du démarrage du serveur:', error);
    process.exit(1);
  }
};

// Gestion des erreurs non capturées
process.on('uncaughtException', (err) => {
  logger.error('Erreur non capturée:', err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  logger.error('Promesse rejetée non gérée:', err);
  process.exit(1);
});

// Gestion de l'arrêt gracieux
process.on('SIGTERM', () => {
  logger.info('Signal SIGTERM reçu. Arrêt gracieux...');
  server.close(() => {
    logger.info('Serveur arrêté');
    mongoose.connection.close(false, () => {
      logger.info('Connexion MongoDB fermée');
      process.exit(0);
    });
  });
});

// Démarrage de l'application
startServer();

module.exports = { app, server, redis }; 
