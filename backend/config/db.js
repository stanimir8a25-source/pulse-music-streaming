const mongoose = require('mongoose');

// Тази функция свързва приложението с MongoDB.
// Извикваме я веднъж при стартиране на сървъра.
async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('Липсва MONGODB_URI в .env файла');
  }

  await mongoose.connect(uri);
  console.log('Свързан с MongoDB');
}

module.exports = connectDB;
