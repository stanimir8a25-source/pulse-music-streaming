const mongoose = require('mongoose');

// Схема = "план" как изглежда един потребител в базата данни.
const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    // Паролата се записва криптирана (bcrypt) при регистрация.
    password: {
      type: String,
      required: true,
    },
    // Три роли: listener, artist, admin
    role: {
      type: String,
      enum: ['listener', 'artist', 'admin'],
      default: 'listener',
    },
    // Профилна снимка
    avatarPath: {
      type: String,
      default: '',
    },
    // Дали имейлът е преминал валидация при регистрация
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    // За препоръки: какви песни е слушал
    listeningHistory: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Song',
      },
    ],
  },
  {
    timestamps: true, // добавя createdAt и updatedAt автоматично
  }
);

module.exports = mongoose.model('User', userSchema);
