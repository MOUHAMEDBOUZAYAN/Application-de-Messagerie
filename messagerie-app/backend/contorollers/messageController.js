const Message = require('../models/Message');
const Room = require('../models/Room');
const logger = require('../utils/logger');
const { getRedisClient } = require('../config/redis');

// Envoyer un message
const sendMessage = async (req, res) => {
  try {
    const { content, roomId, messageType = 'text', replyTo } = req.body;
    const userId = req.user._id;

    // Vérifier si la room existe et si l'utilisateur est participant
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room non trouvée' });
    }

    const isParticipant = room.participants.some(
      p => p.user.toString() === userId.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({ 
        message: 'Vous n\'êtes pas autorisé à envoyer des messages dans cette room' 
      });
    }

    // Créer le message
    const message = new Message({
      content,
      sender: userId,
      room: roomId,
      messageType,
      replyTo
    });

    await message.save();

    // Peupler les données pour la réponse
    await message.populate('sender', 'username email');
    if (replyTo) {
      await message.populate('replyTo', 'content sender');
    }

    // Mettre à jour l'activité de la room
    room.lastActivity = Date.now();
    await room.save();

    // Mettre en cache le message récent
    const redis = getRedisClient();
    const cacheKey = `recent_messages:${roomId}`;
    await redis.lpush(cacheKey, JSON.stringify(message));
    await redis.ltrim(cacheKey, 0, 49); // Garder seulement les 50 derniers messages
    await redis.expire(cacheKey, 3600); // Expirer après 1 heure

    logger.info(`Message envoyé dans la room ${room.code} par ${req.user.email}`);

    res.status(201).json({
      message: 'Message envoyé avec succès',
      data: message
    });

  } catch (error) {
    logger.error('Erreur lors de l\'envoi du message:', error.message);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
};

// Obtenir les messages d'une room
const getRoomMessages = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const userId = req.user._id;

    // Vérifier si l'utilisateur est participant de la room
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room non trouvée' });
    }

    const isParticipant = room.participants.some(
      p => p.user.toString() === userId.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({ 
        message: 'Vous n\'êtes pas autorisé à voir les messages de cette room' 
      });
    }

    // Essayer de récupérer depuis le cache pour la première page
    if (page == 1) {
      const redis = getRedisClient();
      const cacheKey = `recent_messages:${roomId}`;
      const cachedMessages = await redis.lrange(cacheKey, 0, limit - 1);
      
      if (cachedMessages.length > 0) {
        const messages = cachedMessages.map(msg => JSON.parse(msg));
        return res.json({
          message: 'Messages récupérés (cache)',
          messages: messages.reverse(), // Inverser pour avoir l'ordre chronologique
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: messages.length
          }
        });
      }
    }

    // Récupérer depuis la base de données
    const messages = await Message.getMessagesForRoom(roomId, page, limit);
    
    // Compter le total pour la pagination
    const totalMessages = await Message.countDocuments({ room: roomId });

    res.json({
      message: 'Messages récupérés',
      messages: messages.reverse(), // Inverser pour avoir l'ordre chronologique
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalMessages,
        pages: Math.ceil(totalMessages / limit)
      }
    });

  } catch (error) {
    logger.error('Erreur lors de la récupération des messages:', error.message);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
};

// Marquer un message comme lu
const markMessageAsRead = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message non trouvé' });
    }

    // Vérifier si l'utilisateur est dans la room
    const room = await Room.findById(message.room);
    const isParticipant = room.participants.some(
      p => p.user.toString() === userId.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({ 
        message: 'Vous n\'êtes pas autorisé à marquer ce message comme lu' 
      });
    }

    // Ne pas marquer ses propres messages comme lus
    if (message.sender.toString() === userId.toString()) {
      return res.status(400).json({ 
        message: 'Vous ne pouvez pas marquer vos propres messages comme lus' 
      });
    }

    message.markAsRead(userId);
    await message.save();

    res.json({ message: 'Message marqué comme lu' });

  } catch (error) {
    logger.error('Erreur lors du marquage du message comme lu:', error.message);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
};

// Modifier un message
const editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message non trouvé' });
    }

    // Vérifier si l'utilisateur est l'auteur du message
    if (message.sender.toString() !== userId.toString()) {
      return res.status(403).json({ 
        message: 'Vous ne pouvez modifier que vos propres messages' 
      });
    }

    // Vérifier si le message n'est pas trop ancien (par exemple, 15 minutes)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    if (message.createdAt < fifteenMinutesAgo) {
      return res.status(400).json({ 
        message: 'Vous ne pouvez plus modifier ce message (trop ancien)' 
      });
    }

    message.editMessage(content);
    await message.save();

    // Mettre à jour le cache
    const redis = getRedisClient();
    const cacheKey = `recent_messages:${message.room}`;
    await redis.del(cacheKey); // Supprimer le cache pour forcer la mise à jour

    logger.info(`Message modifié par ${req.user.email}`);

    res.json({ 
      message: 'Message modifié avec succès',
      data: message
    });

  } catch (error) {
    logger.error('Erreur lors de la modification du message:', error.message);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
};

// Supprimer un message
const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message non trouvé' });
    }

    // Vérifier si l'utilisateur est l'auteur du message ou admin de la room
    const room = await Room.findById(message.room);
    const isAuthor = message.sender.toString() === userId.toString();
    const isRoomCreator = room.creator.toString() === userId.toString();

    if (!isAuthor && !isRoomCreator) {
      return res.status(403).json({ 
        message: 'Vous ne pouvez supprimer que vos propres messages' 
      });
    }

    await Message.findByIdAndDelete(messageId);

    // Mettre à jour le cache
    const redis = getRedisClient();
    const cacheKey = `recent_messages:${message.room}`;
    await redis.del(cacheKey); // Supprimer le cache pour forcer la mise à jour

    logger.info(`Message supprimé par ${req.user.email}`);

    res.json({ message: 'Message supprimé avec succès' });

  } catch (error) {
    logger.error('Erreur lors de la suppression du message:', error.message);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
};

// Obtenir les messages non lus
const getUnreadMessages = async (req, res) => {
  try {
    const userId = req.user._id;

    // Trouver les rooms où l'utilisateur est participant
    const userRooms = await Room.find({
      'participants.user': userId
    }).select('_id');

    const roomIds = userRooms.map(room => room._id);

    // Trouver les messages non lus dans ces rooms
    const unreadMessages = await Message.find({
      room: { $in: roomIds },
      sender: { $ne: userId }, // Exclure ses propres messages
      'readBy.user': { $ne: userId } // Messages non lus par cet utilisateur
    })
    .populate('sender', 'username email')
    .populate('room', 'name code')
    .sort({ createdAt: -1 })
    .limit(100);

    res.json({
      message: 'Messages non lus récupérés',
      unreadMessages,
      count: unreadMessages.length
    });

  } catch (error) {
    logger.error('Erreur lors de la récupération des messages non lus:', error.message);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
};

module.exports = {
  sendMessage,
  getRoomMessages,
  markMessageAsRead,
  editMessage,
  deleteMessage,
  getUnreadMessages
};