const path = require('path');
const multer = require('multer');
const fs = require('fs');

const avatarsDir = path.join(__dirname, '..', 'uploads', 'avatars');
if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
}

// Къде да се пазят качените файлове
const storage = multer.diskStorage({
  destination(req, file, cb) {
    if (file.fieldname === 'audio') {
      cb(null, path.join(__dirname, '..', 'uploads', 'audio'));
    } else if (file.fieldname === 'cover') {
      cb(null, path.join(__dirname, '..', 'uploads', 'covers'));
    } else if (file.fieldname === 'avatar') {
      cb(null, avatarsDir);
    } else {
      cb(new Error('Непознато поле за файл'));
    }
  },
  filename(req, file, cb) {
    const unique = `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`;
    cb(null, unique);
  },
});

function fileFilter(req, file, cb) {
  if (file.fieldname === 'audio') {
    if (
      file.mimetype === 'audio/mpeg' ||
      file.mimetype === 'audio/mp3' ||
      file.originalname.toLowerCase().endsWith('.mp3')
    ) {
      return cb(null, true);
    }
    return cb(new Error('Аудио файлът трябва да е MP3.'));
  }

  if (file.fieldname === 'cover' || file.fieldname === 'avatar') {
    if (file.mimetype.startsWith('image/')) {
      return cb(null, true);
    }
    return cb(new Error('Файлът трябва да е изображение.'));
  }

  cb(new Error('Непознат файл.'));
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 30 * 1024 * 1024,
  },
});

const uploadSongFiles = upload.fields([
  { name: 'audio', maxCount: 1 },
  { name: 'cover', maxCount: 1 },
]);

const uploadAvatar = upload.single('avatar');

module.exports = { uploadSongFiles, uploadAvatar };
