const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'file', 'system'],
    default: 'text'
  },
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  editedAt: {
    type: Date,
    default: null
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  }
}, {
  timestamps: true
});

// Index pour améliorer les performances
messageSchema.index({ room: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });

// Méthode pour marquer comme lu
messageSchema.methods.markAsRead = function(userId) {
  const alreadyRead = this.readBy.some(
    r => r.user.toString() === userId.toString()
  );

  if (!alreadyRead) {
    this.readBy.push({ user: userId });
  }
};

// Méthode pour modifier le message
messageSchema.methods.editMessage = function(newContent) {
  this.content = newContent;
  this.editedAt = Date.now();
  this.isEdited = true;
};

// Méthode statique pour obtenir les messages d'une room
messageSchema.statics.getMessagesForRoom = function(roomId, page = 1, limit = 50) {
  return this.find({ room: roomId })
    .populate('sender', 'username email')
    .populate('replyTo')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .exec();
};
module.exports = mongoose.model('Message', messageSchema);