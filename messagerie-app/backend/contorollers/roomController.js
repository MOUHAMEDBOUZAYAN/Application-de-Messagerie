const Room = require('../models/Room');
const Message = require('../models/Message');
const logger = require('../utils/logger');
const { getRedisClient } = require('../config/redis');

// Créer une nouvelle room
const createRoom = async (req, res) => {
  try {
    const { name, code, description, maxParticipants } = req.body;
    const userId = req.user._id;

    // Vérifier si le code existe déjà
    const existingRoom = await Room.findOne({ code: code.toUpperCase() });
    if (existingRoom) {
      return res.status(400).json({ 
        message: 'Ce code de room existe déjà' 
      });
    }

    // Créer la nouvelle room
    const room = new Room({
      name,
      code: code.toUpperCase(),
      description,
      creator: userId,
      maxParticipants: maxParticipants || 50,
      participants: [{ user: userId, isOnline: true }]
    });

    await room.save();
    
    // Peupler les données pour la réponse
    await room.populate('creator', 'username email');
    await room.populate('participants.user', 'username email');

    // Mettre en cache
    const redis = getRedisClient();
    await redis.setex(`room:${room.code}`, 3600, JSON.stringify(room));

    logger.info(`Nouvelle room créée: ${code} par ${req.user.email}`);

    res.status(201).json({
      message: 'Room créée avec succès',
      room
    });

  } catch (error) {
    logger.error('Erreur lors de la création de la room:', error.message);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
};

// Rejoindre une room
const joinRoom = async (req, res) => {
  try {
    const { code } = req.params;
    const userId = req.user._id;

    // Chercher la room
    let room = await Room.findOne({ code: code.toUpperCase() });
    if (!room) {
      return res.status(404).json({ message: 'Room non trouvée' });
    }

    // Vérifier si l'utilisateur est déjà dans la room
    const isAlreadyParticipant = room.participants.some(
      p => p.user.toString() === userId.toString()
    );

    if (isAlreadyParticipant) {
      // Mettre à jour le statut en ligne
      room.updateParticipantStatus(userId, true);
      await room.save();
    } else {
      // Ajouter le participant
      const added = room.addParticipant(userId);
      if (!added) {
        return res.status(400).json({ 
          message: 'Room pleine ou erreur lors de l\'ajout' 
        });
      }
      await room.save();
    }

    // Peupler les données
    await room.populate('creator', 'username email');
    await room.populate('participants.user', 'username email');

    // Mettre à jour le cache
    const redis = getRedisClient();
    await redis.setex(`room:${room.code}`, 3600, JSON.stringify(room));

    // Créer un message système
    const systemMessage = new Message({
      content: `${req.user.username} a rejoint la room`,
      sender: userId,
      room: room._id,
      messageType: 'system'
    });
    await systemMessage.save();

    logger.info(`${req.user.email} a rejoint la room: ${code}`);

    res.json({
      message: 'Room rejointe avec succès',
      room
    });

  } catch (error) {
    logger.error('Erreur lors de la jonction à la room:', error.message);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
};

// Quitter une room
const leaveRoom = async (req, res) => {
  try {
    const { code } = req.params;
    const userId = req.user._id;

    const room = await Room.findOne({ code: code.toUpperCase() });
    if (!room) {
      return res.status(404).json({ message: 'Room non trouvée' });
    }

    // Retirer le participant
    room.removeParticipant(userId);
    await room.save();

    // Créer un message système
    const systemMessage = new Message({
      content: `${req.user.username} a quitté la room`,
      sender: userId,
      room: room._id,
      messageType: 'system'
    });
    await systemMessage.save();

    // Mettre à jour le cache
    const redis = getRedisClient();
    await redis.setex(`room:${room.code}`, 3600, JSON.stringify(room));

    logger.info(`${req.user.email} a quitté la room: ${code}`);

    res.json({ message: 'Room quittée avec succès' });

  } catch (error) {
    logger.error('Erreur lors de la sortie de la room:', error.message);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
};

// Obtenir les détails d'une room
const getRoomDetails = async (req, res) => {
  try {
    const { code } = req.params;
    const userId = req.user._id;

    // Essayer de récupérer depuis le cache d'abord
    const redis = getRedisClient();
    const cachedRoom = await redis.get(`room:${code.toUpperCase()}`);

    if (cachedRoom) {
      const room = JSON.parse(cachedRoom);
      
      // Vérifier si l'utilisateur est participant
      const isParticipant = room.participants.some(
        p => p.user._id === userId.toString()
      );

      if (!isParticipant) {
        return res.status(403).json({ 
          message: 'Vous n\'êtes pas autorisé à voir cette room' 
        });
      }

      return res.json({
        message: 'Détails de la room récupérés',
        room
      });
    }

    // Si pas en cache, récupérer depuis la base de données
    const room = await Room.findOne({ code: code.toUpperCase() })
      .populate('creator', 'username email')
      .populate('participants.user', 'username email isOnline');

    if (!room) {
      return res.status(404).json({ message: 'Room non trouvée' });
    }

    // Vérifier si l'utilisateur est participant
    const isParticipant = room.participants.some(
      p => p.user._id.toString() === userId.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({ 
        message: 'Vous n\'êtes pas autorisé à voir cette room' 
      });
    }

    // Mettre en cache
    await redis.setex(`room:${room.code}`, 3600, JSON.stringify(room));

    res.json({
      message: 'Détails de la room récupérés',
      room
    });

  } catch (error) {
    logger.error('Erreur lors de la récupération des détails de la room:', error.message);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
};

// Obtenir les rooms de l'utilisateur
const getUserRooms = async (req, res) => {
  try {
    const userId = req.user._id;

    const rooms = await Room.find({
      'participants.user': userId
    })
    .populate('creator', 'username email')
    .populate('participants.user', 'username email isOnline')
    .sort({ lastActivity: -1 });

    res.json({
      message: 'Rooms récupérées',
      rooms
    });

  } catch (error) {
    logger.error('Erreur lors de la récupération des rooms utilisateur:', error.message);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
};

// Obtenir les participants d'une room
const getRoomParticipants = async (req, res) => {
  try {
    const { code } = req.params;
    const userId = req.user._id;

    const room = await Room.findOne({ code: code.toUpperCase() })
      .populate('participants.user', 'username email isOnline lastSeen');

    if (!room) {
      return res.status(404).json({ message: 'Room non trouvée' });
    }

    // Vérifier si l'utilisateur est participant
    const isParticipant = room.participants.some(
      p => p.user._id.toString() === userId.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({ 
        message: 'Vous n\'êtes pas autorisé à voir les participants' 
      });
    }

    res.json({
      message: 'Participants récupérés',
      participants: room.participants
    });

  } catch (error) {
    logger.error('Erreur lors de la récupération des participants:', error.message);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
};

// Supprimer une room (seulement pour le créateur)
const deleteRoom = async (req, res) => {
  try {
    const { code } = req.params;
    const userId = req.user._id;

    const room = await Room.findOne({ code: code.toUpperCase() });
    if (!room) {
      return res.status(404).json({ message: 'Room non trouvée' });
    }

    // Vérifier si l'utilisateur est le créateur
    if (room.creator.toString() !== userId.toString()) {
      return res.status(403).json({ 
        message: 'Seul le créateur peut supprimer la room' 
      });
    }

    // Supprimer tous les messages de la room
    await Message.deleteMany({ room: room._id });

    // Supprimer la room
    await Room.findByIdAndDelete(room._id);

    // Supprimer du cache
    const redis = getRedisClient();
    await redis.del(`room:${room.code}`);

    logger.info(`Room supprimée: ${code} par ${req.user.email}`);

    res.json({ message: 'Room supprimée avec succès' });

  } catch (error) {
    logger.error('Erreur lors de la suppression de la room:', error.message);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
};

module.exports = {
  createRoom,
  joinRoom,
  leaveRoom,
  getRoomDetails,
  getUserRooms,
  getRoomParticipants,
  deleteRoom
};