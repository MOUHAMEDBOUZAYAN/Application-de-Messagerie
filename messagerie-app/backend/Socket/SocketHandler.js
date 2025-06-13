const { socketAuth } = require('../middleware/auth');
const User = require('../models/User');
const Room = require('../models/Room');
const Message = require('../models/Message');
const logger = require('../utils/logger');

const socketHandler = (io) => {
  // Middleware d'authentification pour Socket.IO
  io.use(socketAuth);

  io.on('connection', async (socket) => {
    try {
      const user = socket.user;
      logger.info(`Utilisateur connecté via Socket.IO: ${user.email}`);

      // Mettre à jour le statut de l'utilisateur
      await User.findByIdAndUpdate(user._id, {
        isOnline: true,
        socketId: socket.id,
        lastSeen: Date.now()
      });

      // Rejoindre les rooms de l'utilisateur
      const userRooms = await Room.find({
        'participants.user': user._id
      });

      for (const room of userRooms) {
        socket.join(room.code);
        
        // Mettre à jour le statut en ligne dans la room
        room.updateParticipantStatus(user._id, true);
        await room.save();

        // Notifier les autres participants
        socket.to(room.code).emit('userStatusChange', {
          userId: user._id,
          username: user.username,
          status: 'online'
        });
      }

      // Écouter les événements des messages
      socket.on('sendMessage', async (data) => {
        try {
          const { content, roomCode, messageType = 'text', replyTo } = data;

          // Trouver la room
          const room = await Room.findOne({ code: roomCode.toUpperCase() });
          if (!room) {
            socket.emit('error', { message: 'Room non trouvée' });
            return;
          }

          // Vérifier si l'utilisateur est participant
          const isParticipant = room.participants.some(
            p => p.user.toString() === user._id.toString()
          );

          if (!isParticipant) {
            socket.emit('error', { 
              message: 'Vous n\'êtes pas autorisé à envoyer des messages dans cette room' 
            });
            return;
          }

          // Créer le message
          const message = new Message({
            content,
            sender: user._id,
            room: room._id,
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

          // Envoyer le message à tous les participants de la room
          io.to(roomCode.toUpperCase()).emit('newMessage', {
            message,
            roomCode: roomCode.toUpperCase()
          });

          logger.info(`Message envoyé via Socket.IO dans ${roomCode} par ${user.email}`);

        } catch (error) {
          logger.error('Erreur lors de l\'envoi du message via Socket.IO:', error.message);
          socket.emit('error', { message: 'Erreur lors de l\'envoi du message' });
        }
      });

      // Rejoindre une room
      socket.on('joinRoom', async (data) => {
        try {
          const { roomCode } = data;

          const room = await Room.findOne({ code: roomCode.toUpperCase() })
            .populate('creator', 'username email')
            .populate('participants.user', 'username email');

          if (!room) {
            socket.emit('error', { message: 'Room non trouvée' });
            return;
          }

          // Vérifier si l'utilisateur est déjà participant
          const isAlreadyParticipant = room.participants.some(
            p => p.user._id.toString() === user._id.toString()
          );

          if (!isAlreadyParticipant) {
            // Ajouter le participant
            const added = room.addParticipant(user._id);
            if (!added) {
              socket.emit('error', { message: 'Impossible de rejoindre la room' });
              return;
            }
            await room.save();
            await room.populate('participants.user', 'username email');
          }

          // Rejoindre la room Socket.IO
          socket.join(roomCode.toUpperCase());

          // Mettre à jour le statut en ligne
          room.updateParticipantStatus(user._id, true);
          await room.save();

          // Notifier les autres participants
          socket.to(roomCode.toUpperCase()).emit('userJoined', {
            user: {
              _id: user._id,
              username: user.username,
              email: user.email
            },
            roomCode: roomCode.toUpperCase()
          });

          // Confirmer la jonction à l'utilisateur
          socket.emit('roomJoined', {
            room,
            message: 'Room rejointe avec succès'
          });

          // Envoyer la liste des participants en ligne
          const onlineParticipants = room.participants.filter(p => p.isOnline);
          socket.emit('participantsList', {
            participants: onlineParticipants,
            roomCode: roomCode.toUpperCase()
          });

          logger.info(`${user.email} a rejoint la room ${roomCode} via Socket.IO`);

        } catch (error) {
          logger.error('Erreur lors de la jonction à la room via Socket.IO:', error.message);
          socket.emit('error', { message: 'Erreur lors de la jonction à la room' });
        }
      });

      // Quitter une room
      socket.on('leaveRoom', async (data) => {
        try {
          const { roomCode } = data;

          const room = await Room.findOne({ code: roomCode.toUpperCase() });
          if (!room) {
            socket.emit('error', { message: 'Room non trouvée' });
            return;
          }

          // Quitter la room Socket.IO
          socket.leave(roomCode.toUpperCase());

          // Mettre à jour le statut hors ligne dans la room
          room.updateParticipantStatus(user._id, false);
          await room.save();

          // Notifier les autres participants
          socket.to(roomCode.toUpperCase()).emit('userLeft', {
            user: {
              _id: user._id,
              username: user.username
            },
            roomCode: roomCode.toUpperCase()
          });

          socket.emit('roomLeft', {
            roomCode: roomCode.toUpperCase(),
            message: 'Room quittée avec succès'
          });

          logger.info(`${user.email} a quitté la room ${roomCode} via Socket.IO`);

        } catch (error) {
          logger.error('Erreur lors de la sortie de la room via Socket.IO:', error.message);
          socket.emit('error', { message: 'Erreur lors de la sortie de la room' });
        }
      });

      // Écouter le statut de frappe
      socket.on('typing', (data) => {
        const { roomCode, isTyping } = data;
        socket.to(roomCode.toUpperCase()).emit('userTyping', {
          userId: user._id,
          username: user.username,
          isTyping
        });
      });

      // Marquer les messages comme lus
      socket.on('markMessagesAsRead', async (data) => {
        try {
          const { roomCode } = data;

          const room = await Room.findOne({ code: roomCode.toUpperCase() });
          if (!room) {
            socket.emit('error', { message: 'Room non trouvée' });
            return;
          }

          // Marquer tous les messages non lus comme lus
          await Message.updateMany(
            {
              room: room._id,
              sender: { $ne: user._id },
              readBy: { $ne: user._id }
            },
            {
              $addToSet: { readBy: user._id }
            }
          );

          // Notifier les autres participants
          socket.to(roomCode.toUpperCase()).emit('messagesRead', {
            userId: user._id,
            roomCode: roomCode.toUpperCase()
          });

          logger.info(`Messages marqués comme lus par ${user.email} dans la room ${roomCode}`);

        } catch (error) {
          logger.error('Erreur lors du marquage des messages comme lus:', error.message);
          socket.emit('error', { message: 'Erreur lors du marquage des messages comme lus' });
        }
      });

      // Gérer la déconnexion
      socket.on('disconnect', async () => {
        try {
          // Mettre à jour le statut de l'utilisateur
          await User.findByIdAndUpdate(user._id, {
            isOnline: false,
            lastSeen: Date.now()
          });

          // Mettre à jour le statut dans toutes les rooms
          const userRooms = await Room.find({
            'participants.user': user._id
          });

          for (const room of userRooms) {
            room.updateParticipantStatus(user._id, false);
            await room.save();

            // Notifier les autres participants
            socket.to(room.code).emit('userStatusChange', {
              userId: user._id,
              username: user.username,
              status: 'offline'
            });
          }

          logger.info(`Utilisateur déconnecté via Socket.IO: ${user.email}`);

        } catch (error) {
          logger.error('Erreur lors de la déconnexion:', error.message);
        }
      });

    } catch (error) {
      logger.error('Erreur lors de la connexion Socket.IO:', error.message);
      socket.disconnect();
    }
  });
};

module.exports = socketHandler;