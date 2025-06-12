const jwt = require('jsonwebtoken');
const config = require('../config/config');
const User = require('../models/User');
const logger = require('../utils/logger');

// Middleware d'authentification pour les routes HTTP
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Authentification requise' });
    }

    const decoded = jwt.verify(token, config.jwtSecret);
    const user = await User.findOne({ _id: decoded.userId });

    if (!user) {
      return res.status(401).json({ message: 'Utilisateur non trouvé' });
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    logger.error('Erreur d\'authentification:', error.message);
    res.status(401).json({ message: 'Token invalide' });
  }
};

// Middleware d'authentification pour Socket.IO
const socketAuth = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentification requise'));
    }

    const decoded = jwt.verify(token, config.jwtSecret);
    const user = await User.findOne({ _id: decoded.userId });

    if (!user) {
      return next(new Error('Utilisateur non trouvé'));
    }

    socket.user = user;
    next();
  } catch (error) {
    logger.error('Erreur d\'authentification Socket.IO:', error.message);
    next(new Error('Token invalide'));
  }
};

// Middleware de vérification des rôles
const checkRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'Vous n\'avez pas les permissions nécessaires' 
      });
    }
    next();
  };
};

module.exports = {
  auth,
  socketAuth,
  checkRole
};