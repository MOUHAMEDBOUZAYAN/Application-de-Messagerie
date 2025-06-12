const Room = require('../models/Room');
const Message = require('../models/Message');
const logger = require('../utils/logger');
const { validationResult } = require('express-validator');

// Créer une nouvelle room
exports.createRoom = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, isPrivate, maxParticipants } = req.body;
    const creator = req.user._id;

    // Générer un code unique pour la room
    const code = await Room.generateUniqueCode();

    // Créer la room
    const room = new Room({
      name,
      code,
      creator,
      isPrivate,
      maxParticipants: maxParticipants || 10
    });

    // Ajouter le créateur comme participant
    room.addParticipant(creator);

    await room.save();
    await room.populate('creator', 'username email');
    await room.populate('participants.user', 'username email');

    res.status(201).json({
      message: 'Room créée avec succès',
      room
    });

    logger.info(`Nouvelle room créée: ${code} par ${req.user.email}`);

  } catch (error) {
    logger.error('Erreur lors de la création de la room:', error.message);
    res.status(500).json({
      message: 'Erreur lors de la création de la room'
    });
  }
};

// Rejoindre une room
exports.joinRoom = async (req, res) => {
  try {
    const { code } = req.body;
    const userId = req.user._id;

    const room = await Room.findOne({ code: code.toUpperCase() });
    if (!room) {
      return res.status(404).json({
        message: 'Room non trouvée'
      });
    }

    // Vérifier si la room est active
    if (room.status !== 'active') {
      return res.status(403).json({
        message: 'Cette room n\'est plus active'
      });
    }

    // Ajouter le participant
    const added = room.addParticipant(userId);
    if (!added) {
      return res.status(400).json({
        message: 'Impossible de rejoindre la room'
      });
    }

    await room.save();
    await room.populate('participants.user', 'username email');

    res.json({
      message: 'Room rejointe avec succès',
      room
    });

    logger.info(`Utilisateur ${req.user.email} a rejoint la room ${code}`);

  } catch (error) {
    logger.error('Erreur lors de la jonction à la room:', error.message);
    res.status(500).json({
      message: 'Erreur lors de la jonction à la room'
    });
  }
};

// Quitter une room
exports.leaveRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user._id;

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({
        message: 'Room non trouvée'
      });
    }

    // Vérifier si l'utilisateur est le créateur
    if (room.creator.toString() === userId.toString()) {
      return res.status(400).json({
        message: 'Le créateur ne peut pas quitter la room'
      });
    }

    // Retirer le participant
    room.removeParticipant(userId);
    await room.save();

    res.json({
      message: 'Room quittée avec succès'
    });

    logger.info(`Utilisateur ${req.user.email} a quitté la room ${room.code}`);

  } catch (error) {
    logger.error('Erreur lors de la sortie de la room:', error.message);
    res.status(500).json({
      message: 'Erreur lors de la sortie de la room'
    });
  }
};

// Obtenir les détails d'une room
exports.getRoomDetails = async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await Room.findById(roomId)
      .populate('creator', 'username email')
      .populate('participants.user', 'username email');

    if (!room) {
      return res.status(404).json({
        message: 'Room non trouvée'
      });
    }

    // Vérifier si l'utilisateur est participant
    const isParticipant = room.isParticipant(req.user._id);
    if (!isParticipant) {
      return res.status(403).json({
        message: 'Vous n\'êtes pas autorisé à accéder à cette room'
      });
    }

    res.json({
      room
    });

  } catch (error) {
    logger.error('Erreur lors de la récupération des détails de la room:', error.message);
    res.status(500).json({
      message: 'Erreur lors de la récupération des détails de la room'
    });
  }
};

// Obtenir la liste des rooms de l'utilisateur
exports.getUserRooms = async (req, res) => {
  try {
    const userId = req.user._id;

    const rooms = await Room.find({
      'participants.user': userId,
      status: 'active'
    })
    .populate('creator', 'username email')
    .populate('participants.user', 'username email')
    .sort({ lastActivity: -1 });

    res.json({
      rooms
    });

  } catch (error) {
    logger.error('Erreur lors de la récupération des rooms:', error.message);
    res.status(500).json({
      message: 'Erreur lors de la récupération des rooms'
    });
  }
};

// Archiver une room
exports.archiveRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user._id;

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({
        message: 'Room non trouvée'
      });
    }

    // Vérifier si l'utilisateur est le créateur
    if (room.creator.toString() !== userId.toString()) {
      return res.status(403).json({
        message: 'Seul le créateur peut archiver la room'
      });
    }

    room.status = 'archived';
    await room.save();

    res.json({
      message: 'Room archivée avec succès'
    });

    logger.info(`Room ${room.code} archivée par ${req.user.email}`);

  } catch (error) {
    logger.error('Erreur lors de l\'archivage de la room:', error.message);
    res.status(500).json({
      message: 'Erreur lors de l\'archivage de la room'
    });
  }
};

// Obtenir les messages d'une room
exports.getRoomMessages = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({
        message: 'Room non trouvée'
      });
    }

    // Vérifier si l'utilisateur est participant
    const isParticipant = room.isParticipant(req.user._id);
    if (!isParticipant) {
      return res.status(403).json({
        message: 'Vous n\'êtes pas autorisé à accéder aux messages de cette room'
      });
    }

    const messages = await Message.find({ room: roomId })
      .populate('sender', 'username email')
      .populate('replyTo')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Message.countDocuments({ room: roomId });

    res.json({
      messages,
      totalPages: Math.ceil(count / limit),
      currentPage: page
    });

  } catch (error) {
    logger.error('Erreur lors de la récupération des messages:', error.message);
    res.status(500).json({
      message: 'Erreur lors de la récupération des messages'
    });
  }
}; 