const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    minlength: 4,
    maxlength: 8
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  description: {
    type: String,
    maxlength: 200,
    default: ''
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
    joinedAt: {
      type: Date,
      default: Date.now
    },
    isOnline: {
      type: Boolean,
      default: false
    }
  }],
  maxParticipants: {
    type: Number,
    default: 50,
    min: 2,
    max: 100
  },
  isPrivate: {
    type: Boolean,
    default: true
  },
  lastActivity: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index pour améliorer les performances
roomSchema.index({ code: 1 });
roomSchema.index({ creator: 1 });
roomSchema.index({ 'participants.user': 1 });

// Méthode pour ajouter un participant
roomSchema.methods.addParticipant = function(userId) {
  const isAlreadyParticipant = this.participants.some(
    p => p.user.toString() === userId.toString()
  );
  
  if (!isAlreadyParticipant && this.participants.length < this.maxParticipants) {
    this.participants.push({ user: userId });
    this.lastActivity = Date.now();
    return true;
  }
  return false;
};

// Méthode pour retirer un participant
roomSchema.methods.removeParticipant = function(userId) {
  this.participants = this.participants.filter(
    p => p.user.toString() !== userId.toString()
  );
  this.lastActivity = Date.now();
};

// Méthode pour mettre à jour le statut en ligne
roomSchema.methods.updateParticipantStatus = function(userId, isOnline) {
  const participant = this.participants.find(
    p => p.user.toString() === userId.toString()
  );
  if (participant) {
    participant.isOnline = isOnline;
    this.lastActivity = Date.now();
  }
};

module.exports = mongoose.model('Room', roomSchema);