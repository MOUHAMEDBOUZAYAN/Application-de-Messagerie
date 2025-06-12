const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const messageController = require('../controllers/messageController');
const { auth } = require('../middleware/auth');

// Validation des données de message
const messageValidation = [
  body('content')
    .trim()
    .notEmpty()
    .withMessage('Le contenu du message est requis'),
  body('roomId')
    .notEmpty()
    .withMessage('L\'ID de la room est requis'),
  body('messageType')
    .optional()
    .isIn(['text', 'image', 'file', 'system'])
    .withMessage('Type de message invalide'),
  body('replyTo')
    .optional()
    .isMongoId()
    .withMessage('ID de message de réponse invalide')
];

// Routes des messages
router.post('/send', auth, messageValidation, messageController.sendMessage);
router.post('/:roomId/read', auth, messageController.markMessagesAsRead);
router.delete('/:messageId', auth, messageController.deleteMessage);
router.get('/:roomId/unread', auth, messageController.getUnreadMessages);

module.exports = router; 