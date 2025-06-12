const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
    trim: true
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
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  readBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  metadata: {
    fileName: String,
    fileSize: Number,
    fileType: String,
    fileUrl: String,
    imageUrl: String,
    imageSize: {
      width: Number,
      height: Number
    }
  },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read', 'deleted'],
    default: 'sent'
  }
}, {
  timestamps: true
});

// Méthode pour marquer un message comme lu
messageSchema.methods.markAsRead = async function(userId) {
  if (!this.readBy.includes(userId)) {
    this.readBy.push(userId);
    this.status = 'read';
    await this.save();
  }
};

// Méthode pour marquer un message comme supprimé
messageSchema.methods.markAsDeleted = async function() {
  this.status = 'deleted';
  this.content = 'Ce message a été supprimé';
  await this.save();
};

// Méthode pour obtenir les informations du message pour l'API
messageSchema.methods.toAPI = function() {
  const message = this.toObject();
  message.id = message._id;
  delete message._id;
  delete message.__v;
  return message;
};

// Index pour améliorer les performances des requêtes
messageSchema.index({ room: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });
messageSchema.index({ 'readBy': 1 });
messageSchema.index({ status: 1 });

// Middleware pour nettoyer les messages supprimés après un certain temps
messageSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'deleted') {
    // Planifier la suppression complète après 30 jours
    setTimeout(async () => {
      try {
        await this.deleteOne();
      } catch (error) {
        console.error('Erreur lors de la suppression du message:', error);
      }
    }, 30 * 24 * 60 * 60 * 1000);
  }
  next();
});

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;