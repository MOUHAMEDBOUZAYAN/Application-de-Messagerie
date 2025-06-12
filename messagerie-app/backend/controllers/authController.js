const User = require('../models/User');
const logger = require('../utils/logger');
const { validationResult } = require('express-validator');

// Inscription d'un nouvel utilisateur
exports.register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password } = req.body;

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({
        message: 'Un utilisateur avec cet email ou ce nom d\'utilisateur existe déjà'
      });
    }

    // Créer le nouvel utilisateur
    const user = new User({
      username,
      email,
      password
    });

    await user.save();

    // Générer le token
    const token = user.generateAuthToken();

    res.status(201).json({
      message: 'Inscription réussie',
      user: user.toPublicJSON(),
      token
    });

    logger.info(`Nouvel utilisateur inscrit: ${email}`);

  } catch (error) {
    logger.error('Erreur lors de l\'inscription:', error.message);
    res.status(500).json({
      message: 'Erreur lors de l\'inscription'
    });
  }
};

// Connexion d'un utilisateur
exports.login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Trouver l'utilisateur
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        message: 'Email ou mot de passe incorrect'
      });
    }

    // Vérifier le mot de passe
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        message: 'Email ou mot de passe incorrect'
      });
    }

    // Vérifier si le compte est actif
    if (user.status !== 'active') {
      return res.status(403).json({
        message: 'Votre compte a été désactivé'
      });
    }

    // Générer le token
    const token = user.generateAuthToken();

    // Mettre à jour le statut en ligne
    await user.updateOnlineStatus(true);

    res.json({
      message: 'Connexion réussie',
      user: user.toPublicJSON(),
      token
    });

    logger.info(`Utilisateur connecté: ${email}`);

  } catch (error) {
    logger.error('Erreur lors de la connexion:', error.message);
    res.status(500).json({
      message: 'Erreur lors de la connexion'
    });
  }
};

// Déconnexion d'un utilisateur
exports.logout = async (req, res) => {
  try {
    const user = req.user;

    // Mettre à jour le statut hors ligne
    await user.updateOnlineStatus(false);

    res.json({
      message: 'Déconnexion réussie'
    });

    logger.info(`Utilisateur déconnecté: ${user.email}`);

  } catch (error) {
    logger.error('Erreur lors de la déconnexion:', error.message);
    res.status(500).json({
      message: 'Erreur lors de la déconnexion'
    });
  }
};

// Rafraîchir le token
exports.refreshToken = async (req, res) => {
  try {
    const user = req.user;

    // Vérifier si le compte est actif
    if (user.status !== 'active') {
      return res.status(403).json({
        message: 'Votre compte a été désactivé'
      });
    }

    // Générer un nouveau token
    const token = user.generateAuthToken();

    res.json({
      message: 'Token rafraîchi avec succès',
      token
    });

    logger.info(`Token rafraîchi pour: ${user.email}`);

  } catch (error) {
    logger.error('Erreur lors du rafraîchissement du token:', error.message);
    res.status(500).json({
      message: 'Erreur lors du rafraîchissement du token'
    });
  }
};

// Obtenir le profil de l'utilisateur
exports.getProfile = async (req, res) => {
  try {
    const user = req.user;

    res.json({
      user: user.toPublicJSON()
    });

  } catch (error) {
    logger.error('Erreur lors de la récupération du profil:', error.message);
    res.status(500).json({
      message: 'Erreur lors de la récupération du profil'
    });
  }
};

// Mettre à jour le profil
exports.updateProfile = async (req, res) => {
  try {
    const user = req.user;
    const updates = req.body;

    // Vérifier les champs autorisés
    const allowedUpdates = ['username', 'avatar'];
    const isValidOperation = Object.keys(updates).every(update =>
      allowedUpdates.includes(update)
    );

    if (!isValidOperation) {
      return res.status(400).json({
        message: 'Mise à jour invalide'
      });
    }

    // Appliquer les mises à jour
    Object.keys(updates).forEach(update => {
      user[update] = updates[update];
    });

    await user.save();

    res.json({
      message: 'Profil mis à jour avec succès',
      user: user.toPublicJSON()
    });

    logger.info(`Profil mis à jour pour: ${user.email}`);

  } catch (error) {
    logger.error('Erreur lors de la mise à jour du profil:', error.message);
    res.status(500).json({
      message: 'Erreur lors de la mise à jour du profil'
    });
  }
}; 