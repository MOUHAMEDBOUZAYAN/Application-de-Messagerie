const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/config');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email invalide']
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  socketId: {
    type: String
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  avatar: {
    type: String,
    default: 'default-avatar.png'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'banned'],
    default: 'active'
  }
}, {
  timestamps: true
});

// Hash le mot de passe avant la sauvegarde
userSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

// Méthode pour comparer les mots de passe
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Générer un token JWT
userSchema.methods.generateAuthToken = function() {
  return jwt.sign(
    { userId: this._id },
    config.jwtSecret,
    { expiresIn: config.jwtExpiration }
  );
};

// Méthode pour obtenir les informations publiques de l'utilisateur
userSchema.methods.toPublicJSON = function() {
  const user = this.toObject();
  delete user.password;
  delete user.__v;
  return user;
};

// Méthode pour mettre à jour le statut en ligne
userSchema.methods.updateOnlineStatus = async function(isOnline) {
  this.isOnline = isOnline;
  this.lastSeen = Date.now();
  return this.save();
};

// Index pour améliorer les performances des requêtes
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ isOnline: 1 });
userSchema.index({ lastSeen: 1 });

const User = mongoose.model('User', userSchema);

module.exports = User;