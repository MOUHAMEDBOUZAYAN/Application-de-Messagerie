const Message = require('../models/Message');
const Room = require('../models/Room');
const logger = require('../utils/logger');
const { validationResult } = require('express-validator');

// Envoyer un message
exports.sendMessage = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { content, roomId, messageType = 'text', replyTo } = req.body;
    const sender = req.user._id;

    // Vérifier si la room existe
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({
        message: 'Room non trouvée'
      });
    }

    // Vérifier si l'utilisateur est participant
    const isParticipant = room.isParticipant(sender);
    if (!isParticipant) {
      return res.status(403).json({
        message: 'Vous n\'êtes pas autorisé à envoyer des messages dans cette room'
      });
    }

    // Créer le message
    const message = new Message({
      content,
      sender,
      room: roomId,
      messageType,
      replyTo
    });

    await message.save();
    await message.populate('sender', 'username email');
    
    if (replyTo) {
      await message.populate('replyTo', 'content sender');
    }

    // Mettre à jour l'activité de la room
    room.lastActivity = Date.now();
    await room.save();

    res.status(201).json({
      message: 'Message envoyé avec succès',
      data: message.toAPI()
    });

    logger.info(`Message envoyé dans la room ${room.code} par ${req.user.email}`);

  } catch (error) {
    logger.error('Erreur lors de l\'envoi du message:', error.message);
    res.status(500).json({
      message: 'Erreur lors de l\'envoi du message'
    });
  }
};

// Marquer les messages comme lus
exports.markMessagesAsRead = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user._id;

    // Vérifier si la room existe
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({
        message: 'Room non trouvée'
      });
    }

    // Vérifier si l'utilisateur est participant
    const isParticipant = room.isParticipant(userId);
    if (!isParticipant) {
      return res.status(403).json({
        message: 'Vous n\'êtes pas autorisé à accéder aux messages de cette room'
      });
    }

    // Marquer tous les messages non lus comme lus
    await Message.updateMany(
      {
        room: roomId,
        sender: { $ne: userId },
        readBy: { $ne: userId }
      },
      {
        $addToSet: { readBy: userId }
      }
    );

    res.json({
      message: 'Messages marqués comme lus avec succès'
    });

    logger.info(`Messages marqués comme lus dans la room ${room.code} par ${req.user.email}`);

  } catch (error) {
    logger.error('Erreur lors du marquage des messages comme lus:', error.message);
    res.status(500).json({
      message: 'Erreur lors du marquage des messages comme lus'
    });
  }
};

// Supprimer un message
exports.deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        message: 'Message non trouvé'
      });
    }

    // Vérifier si l'utilisateur est l'expéditeur
    if (message.sender.toString() !== userId.toString()) {
      return res.status(403).json({
        message: 'Vous n\'êtes pas autorisé à supprimer ce message'
      });
    }

    // Marquer le message comme supprimé
    await message.markAsDeleted();

    res.json({
      message: 'Message supprimé avec succès'
    });

    logger.info(`Message supprimé par ${req.user.email}`);

  } catch (error) {
    logger.error('Erreur lors de la suppression du message:', error.message);
    res.status(500).json({
      message: 'Erreur lors de la suppression du message'
    });
  }
};

// Obtenir les messages non lus
exports.getUnreadMessages = async (req, res) => {
  try {
    const userId = req.user._id;
    const { roomId } = req.params;

    // Vérifier si la room existe
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({
        message: 'Room non trouvée'
      });
    }

    // Vérifier si l'utilisateur est participant
    const isParticipant = room.isParticipant(userId);
    if (!isParticipant) {
      return res.status(403).json({
        message: 'Vous n\'êtes pas autorisé à accéder aux messages de cette room'
      });
    }

    const unreadMessages = await Message.find({
      room: roomId,
      sender: { $ne: userId },
      readBy: { $ne: userId }
    })
    .populate('sender', 'username email')
    .sort({ createdAt: -1 });

    res.json({
      unreadCount: unreadMessages.length,
      messages: unreadMessages.map(msg => msg.toAPI())
    });

  } catch (error) {
    logger.error('Erreur lors de la récupération des messages non lus:', error.message);
    res.status(500).json({
      message: 'Erreur lors de la récupération des messages non lus'
    });
  }
}; 