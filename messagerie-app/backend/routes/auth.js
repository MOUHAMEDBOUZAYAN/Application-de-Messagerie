const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { auth } = require('../middleware/auth');

// Validation des données d'inscription
const registerValidation = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
<<<<<<< HEAD
    .withMessage('Le nom d\'utilisateur doit contenir entre 3 et 30 caractères'),
=======
    .withMessage("Le nom d'utilisateur doit contenir entre 3 et 30 caractères"),
>>>>>>> d23bb40354e2e4e8682df7a19281dc8bdfce9b19
  body('email')
    .isEmail()
    .withMessage('Email invalide')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Le mot de passe doit contenir au moins 6 caractères')
];

// Validation des données de connexion
const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Email invalide')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Le mot de passe est requis')
];

// Routes d'authentification
router.post('/register', registerValidation, authController.register);
router.post('/login', loginValidation, authController.login);
router.post('/logout', auth, authController.logout);
router.post('/refresh-token', auth, authController.refreshToken);
router.get('/profile', auth, authController.getProfile);
router.patch('/profile', auth, authController.updateProfile);

<<<<<<< HEAD
module.exports = router; 
=======
module.exports = router;
>>>>>>> d23bb40354e2e4e8682df7a19281dc8bdfce9b19
