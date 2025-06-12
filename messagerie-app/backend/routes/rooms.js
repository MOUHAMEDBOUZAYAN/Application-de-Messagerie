const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const roomController = require('../controllers/roomController');
const { auth } = require('../middleware/auth');

// Validation des données de création de room
const createRoomValidation = [
  body('name')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Le nom de la room doit contenir entre 3 et 50 caractères'),
  body('isPrivate')
    .isBoolean()
    .withMessage('Le champ isPrivate doit être un booléen'),
  body('maxParticipants')
    .optional()
    .isInt({ min: 2, max: 100 })
    .withMessage('Le nombre maximum de participants doit être entre 2 et 100')
];

// Validation des données de jonction à une room
const joinRoomValidation = [
  body('code')
    .trim()
    .isLength({ min: 6, max: 6 })
    .withMessage('Le code de la room doit contenir 6 caractères')
];

// Routes des rooms
router.post('/create', auth, createRoomValidation, roomController.createRoom);
router.post('/join', auth, joinRoomValidation, roomController.joinRoom);
router.post('/leave/:roomId', auth, roomController.leaveRoom);
router.get('/:roomId', auth, roomController.getRoomDetails);
router.get('/user/rooms', auth, roomController.getUserRooms);
router.post('/:roomId/archive', auth, roomController.archiveRoom);
router.get('/:roomId/messages', auth, roomController.getRoomMessages);

module.exports = router; 