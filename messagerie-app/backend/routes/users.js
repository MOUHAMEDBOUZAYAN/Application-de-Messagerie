const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const User = require('../models/User');

// Route pour obtenir le profil de l'utilisateur connecté
router.get('/me', auth, (req, res) => {
  User.findById(req.user.id)
    .select('-password')
    .then(user => res.json(user))
    .catch(err => {
      console.error(err.message);
      res.status(500).send('Erreur serveur');
    });
});

// Route pour mettre à jour le profil de l'utilisateur
router.put('/me', auth, (req, res) => {
  const { username, email } = req.body;
  User.findById(req.user.id)
    .then(user => {
      if (username) user.username = username;
      if (email) user.email = email;
      return user.save();
    })
    .then(user => res.json(user))
    .catch(err => {
      console.error(err.message);
      res.status(500).send('Erreur serveur');
    });
});

// Route pour obtenir la liste des utilisateurs (pour les administrateurs)
router.get('/', auth, (req, res) => {
  User.find()
    .select('-password')
    .then(users => res.json(users))
    .catch(err => {
      console.error(err.message);
      res.status(500).send('Erreur serveur');
    });
});

module.exports = router; 