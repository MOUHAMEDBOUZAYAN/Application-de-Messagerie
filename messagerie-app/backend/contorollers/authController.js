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
