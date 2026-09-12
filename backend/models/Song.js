const mongoose = require('mongoose');

const songSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    artistName: {
      type: String,
      required: true,
      trim: true,
    },
    genre: {
      type: String,
      required: true,
      trim: true,
    },
    // Продължителност в секунди
    duration: {
      type: Number,
      required: true,
      min: 1,
    },
    // Път към mp3 файла на диска (ще се ползва при качване във Фаза 4)
    audioPath: {
      type: String,
      required: true,
    },
    // Път към обложката (картинка)
    coverPath: {
      type: String,
      default: '',
    },
    // Кой артист е качил песента
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Колко пъти е слушана (за статистика)
    playCount: {
      type: Number,
      default: 0,
    },
    // Админът може да скрие неподходящо съдържание
    isHidden: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Song', songSchema);
