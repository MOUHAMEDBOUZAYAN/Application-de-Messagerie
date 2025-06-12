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
const socketHandler = require('./Socket/SocketHandelr');

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

// Configuration Redis
const redis = new Redis(config.redisURL);

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

// Gestion des erreurs
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).json({
    status: 'error',
    message: 'Une erreur est survenue sur le serveur'
  });
});

// Connexion à MongoDB
mongoose.connect(config.mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  logger.info('Connecté à MongoDB');
})
.catch((err) => {
  logger.error('Erreur de connexion à MongoDB:', err);
  process.exit(1);
});

// Initialisation de Socket.IO
socketHandler(io);

// Démarrage du serveur
const PORT = config.port || 3000;
server.listen(PORT, () => {
  logger.info(`Serveur démarré sur le port ${PORT}`);
});

// Gestion des erreurs non capturées
process.on('uncaughtException', (err) => {
  logger.error('Erreur non capturée:', err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  logger.error('Promesse rejetée non gérée:', err);
  process.exit(1);
});

module.exports = { app, server, redis };