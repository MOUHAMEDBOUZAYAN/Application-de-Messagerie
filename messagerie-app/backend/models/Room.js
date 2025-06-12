const mongoose = require('mongoose');
const crypto = require('crypto');

const roomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 50
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    isOnline: {
      type: Boolean,
      default: false
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    role: {
      type: String,
      enum: ['admin', 'member'],
      default: 'member'
    }
  }],
  isPrivate: {
    type: Boolean,
    default: false
  },
  maxParticipants: {
    type: Number,
    default: 10,
    min: 2,
    max: 100
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['active', 'archived', 'deleted'],
    default: 'active'
  }
}, {
  timestamps: true
});

// Générer un code unique pour la room
roomSchema.statics.generateUniqueCode = async function() {
  let code;
  let isUnique = false;

  while (!isUnique) {
    // Générer un code de 6 caractères
    code = crypto.randomBytes(3).toString('hex').toUpperCase();
    
    // Vérifier si le code existe déjà
    const existingRoom = await this.findOne({ code });
    if (!existingRoom) {
      isUnique = true;
    }
  }

  return code;
};

// Méthode pour ajouter un participant
roomSchema.methods.addParticipant = function(userId) {
  // Vérifier si la room est pleine
  if (this.participants.length >= this.maxParticipants) {
    return false;
  }

  // Vérifier si l'utilisateur est déjà participant
  const isAlreadyParticipant = this.participants.some(
    p => p.user.toString() === userId.toString()
  );

  if (isAlreadyParticipant) {
    return true;
  }

  // Ajouter le participant
  this.participants.push({
    user: userId,
    isOnline: true,
    joinedAt: Date.now()
  });

  return true;
};

// Méthode pour retirer un participant
roomSchema.methods.removeParticipant = function(userId) {
  this.participants = this.participants.filter(
    p => p.user.toString() !== userId.toString()
  );
};

// Méthode pour mettre à jour le statut d'un participant
roomSchema.methods.updateParticipantStatus = function(userId, isOnline) {
  const participant = this.participants.find(
    p => p.user.toString() === userId.toString()
  );

  if (participant) {
    participant.isOnline = isOnline;
    return true;
  }

  return false;
};

// Méthode pour vérifier si un utilisateur est participant
roomSchema.methods.isParticipant = function(userId) {
  return this.participants.some(
    p => p.user.toString() === userId.toString()
  );
};

// Méthode pour obtenir les participants en ligne
roomSchema.methods.getOnlineParticipants = function() {
  return this.participants.filter(p => p.isOnline);
};

// Index pour améliorer les performances des requêtes
roomSchema.index({ code: 1 });
roomSchema.index({ creator: 1 });
roomSchema.index({ 'participants.user': 1 });
roomSchema.index({ lastActivity: -1 });
roomSchema.index({ status: 1 });

const Room = mongoose.model('Room', roomSchema);

module.exports = Room;