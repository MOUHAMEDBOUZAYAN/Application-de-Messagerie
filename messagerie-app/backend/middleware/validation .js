const { body, validationResult } = require('express-validator');

// Validation pour l'inscription
const validateRegister = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email invalide'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Le mot de passe doit contenir au moins 6 caractères'),
  body('username')
    .isLength({ min: 3, max: 30 })
    .trim()
    .withMessage('Le nom d\'utilisateur doit contenir entre 3 et 30 caractères')
];

// Validation pour la connexion
const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email invalide'),
  body('password')
    .notEmpty()
    .withMessage('Mot de passe requis')
];

// Validation pour créer une room
const validateCreateRoom = [
  body('name')
    .isLength({ min: 3, max: 50 })
    .trim()
    .withMessage('Le nom de la room doit contenir entre 3 et 50 caractères'),
  body('description')
    .optional()
    .isLength({ max: 200 })
    .trim()
    .withMessage('La description ne peut pas dépasser 200 caractères'),
  body('code')
    .isLength({ min: 4, max: 8 })
    .isAlphanumeric()
    .toUpperCase()
    .withMessage('Le code doit contenir entre 4 et 8 caractères alphanumériques')
];

// Validation pour envoyer un message
const validateMessage = [
  body('content')
    .isLength({ min: 1, max: 1000 })
    .trim()
    .withMessage('Le message doit contenir entre 1 et 1000 caractères'),
  body('messageType')
    .optional()
    .isIn(['text', 'image', 'file'])
    .withMessage('Type de message invalide')
];

// Middleware pour traiter les erreurs de validation
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Erreurs de validation',
      errors: errors.array()
    });
  }
  next();
};

module.exports = {
  validateRegister,
  validateLogin,
  validateCreateRoom,
  validateMessage,
  handleValidationErrors
};