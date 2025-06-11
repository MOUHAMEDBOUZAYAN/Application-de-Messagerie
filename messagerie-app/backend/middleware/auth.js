const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: "Token d'accès requis" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return res.status(401).json({ message: 'Token invalide' });
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error("Erreur d'authentification:", error.message);
    res.status(401).json({ message: 'Token invalide' });
  }
};

// Middleware pour l'authentification Socket.IO
const socketAuth = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error("Token d'accès requis"));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return next(new Error('Token invalide'));
    }

    socket.user = user;
    next();
  } catch (error) {
    logger.error("Erreur d'authentification Socket:", error.message);
    next(new Error('Token invalide'));
  }
};

module.exports = {
  auth,
  socketAuth
};