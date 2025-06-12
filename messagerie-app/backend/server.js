rekkas
rekkas2002
En ligne

rekkas — 23/05/2025 17:56
orad 3liya binma n3awdo ta ana
MOUHAMED — 23/05/2025 17:56
hadxi nadi wlkn b ts asahby
hna version li 3ndna js
rekkas — 23/05/2025 18:10
hania 3tih l chat irdo liik js
MOUHAMED — 23/05/2025 18:10
Hana kan9ad fihom
ou kola wahed n3tiweh fichier i pushi
rekkas — 23/05/2025 18:10
nadi hatchy li bghit ngoliik
MOUHAMED — 23/05/2025 19:37
https://discord.gg/DqrW5FZr
MOUHAMED — 23/05/2025 20:31
ww
khona
rekkas — 24/05/2025 19:48
holla
MOUHAMED — 24/05/2025 20:00
// src/screens/auth/LoginScreen.js
import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import { useAuth } from '../../contexts/AuthContext';
Afficher plus
message.txt
5 Ko
dkhol lserver nwrik fin tzidhom
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Text, HelperText } from 'react-native-paper';
import { useAuth } from '../../contexts/AuthContext';

const RegisterScreen = ({ navigation }) => {
Afficher plus
message.txt
5 Ko
MOUHAMED — 24/05/2025 20:14
https://github.com/MOUHAMEDBOUZAYAN/Plateforme-Mobile
GitHub
GitHub - MOUHAMEDBOUZAYAN/Plateforme-Mobile
Contribute to MOUHAMEDBOUZAYAN/Plateforme-Mobile development by creating an account on GitHub.
ww
// src/screens/main/HomeScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, Card, Button, ActivityIndicator } from 'react-native-paper';
import { useAuth } from '../../contexts/AuthContext';
import { ErrorMessage } from '../../components/ErrorMessage';
Afficher plus
message.txt
8 Ko
MOUHAMED — 24/05/2025 20:22
cc
// src/screens/main/CreateTicketScreen.js
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { TextInput, Button, Text, HelperText, SegmentedButtons } from 'react-native-paper';
import ticketService from '../../services/ticketService';
import { TICKET_PRIORITY, PRIORITY_LABELS } from '../../constants';
Afficher plus
message.txt
7 Ko
MOUHAMED — 25/05/2025 15:50
Ww
dir git pull
ou khdem dak l3alam
rekkas — 25/05/2025 15:51
oui khouya att ghir ntghda
ou ana m3ak
MOUHAMED — 25/05/2025 16:00
Sir 3lah
rekkas — 25/05/2025 21:50
cc
simo
fenk
wach saybty chy haja
ana ylh jit l dar
rekkas — 25/05/2025 22:57
cccc
cccc
ccc
ccc
wa simo
MOUHAMED — 27/05/2025 15:36
Ww
rekkas
 a commencé un appel qui a duré 3 minutes. — 27/05/2025 15:37
MOUHAMED — 27/05/2025 15:46
ww
khona
rekkas — 10/06/2025 17:59
abderrahim
rekkas
MOUHAMED — 10/06/2025 18:07
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
redis.js
MOUHAMED — Hier à 10:52
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'file', 'system'],
    default: 'text'
  },
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  editedAt: {
    type: Date,
    default: null
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  }
}, {
  timestamps: true
});

// Index pour améliorer les performances
messageSchema.index({ room: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });

// Méthode pour marquer comme lu
messageSchema.methods.markAsRead = function(userId) {
  const alreadyRead = this.readBy.some(
    r => r.user.toString() === userId.toString()
  );

  if (!alreadyRead) {
    this.readBy.push({ user: userId });
  }
};

// Méthode pour modifier le message
messageSchema.methods.editMessage = function(newContent) {
  this.content = newContent;
  this.editedAt = Date.now();
  this.isEdited = true;
};

// Méthode statique pour obtenir les messages d'une room
messageSchema.statics.getMessagesForRoom = function(roomId, page = 1, limit = 50) {
  return this.find({ room: roomId })
    .populate('sender', 'username email')
    .populate('replyTo')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .exec();
};

module.exports = mongoose.model('Message', messageSchema);
https://github.com/MOUHAMEDBOUZAYAN/Application-de-Messagerie
GitHub
GitHub - MOUHAMEDBOUZAYAN/Application-de-Messagerie
Contribute to MOUHAMEDBOUZAYAN/Application-de-Messagerie development by creating an account on GitHub.
Contribute to MOUHAMEDBOUZAYAN/Application-de-Messagerie development by creating an account on GitHub.
MOUHAMED — Hier à 11:00
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: 'Token d'accès requis' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return res.status(401).json({ message: 'Token invalide' });
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error('Erreur d'authentification:', error.message);
    res.status(401).json({ message: 'Token invalide' });
  }
};

// Middleware pour l'authentification Socket.IO
const socketAuth = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Token d'accès requis'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return next(new Error('Token invalide'));
    }

    socket.user = user;
    next();
  } catch (error) {
    logger.error('Erreur d'authentification Socket:', error.message);
    next(new Error('Token invalide'));
  }
};

module.exports = {
  auth,
  socketAuth
};
MOUHAMED — Hier à 11:08
https://trello.com/invite/b/68475c43ec52db3109912a6d/ATTI698c510670564e856c7768d2c2ffe1f4CA57A57C/developpement-dune-application-de-messagerie
Trello
Organize anything, together. Trello is a collaboration tool that organizes your projects into boards. In one glance, know what's being worked on, who's working on what, and where something is in a process.
MOUHAMED — Hier à 15:33
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');
const { getRedisClient } = require('../config/redis');

// Générer un token JWT
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// Inscription
const register = async (req, res) => {
  try {
    const { email, password, username } = req.body;

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });

    if (existingUser) {
      return res.status(400).json({ 
        message: 'Email ou nom d\'utilisateur déjà utilisé' 
      });
    }

    // Créer le nouvel utilisateur
    const user = new User({
      email,
      password,
      username
    });

    await user.save();

    // Générer le token
    const token = generateToken(user._id);

    // Mettre en cache les informations utilisateur
    const redis = getRedisClient();
    await redis.setex(`user:${user._id}`, 3600, JSON.stringify(user.toJSON()));

    logger.info(`Nouvel utilisateur inscrit: ${email}`);

    res.status(201).json({
      message: 'Inscription réussie',
      token,
      user: user.toJSON()
    });

  } catch (error) {
    logger.error('Erreur lors de l\'inscription:', error.message);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
};

// Connexion
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Trouver l'utilisateur
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    // Vérifier le mot de passe
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    // Mettre à jour le statut en ligne
    user.isOnline = true;
    user.lastSeen = Date.now();
    await user.save();

    // Générer le token
    const token = generateToken(user._id);

    // Mettre en cache les informations utilisateur
    const redis = getRedisClient();
    await redis.setex(`user:${user._id}`, 3600, JSON.stringify(user.toJSON()));

    logger.info(`Utilisateur connecté: ${email}`);

    res.json({
      message: 'Connexion réussie',
      token,
      user: user.toJSON()
    });

  } catch (error) {
    logger.error('Erreur lors de la connexion:', error.message);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
};

// Déconnexion
... (111lignes restantes)
Réduire
message.txt
6 Ko
contorollers
authControllers
MOUHAMED — 13:00
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
Réduire
message.txt
3 Ko
﻿
MOUHAMED
simobouzi
BOUZAYAN
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