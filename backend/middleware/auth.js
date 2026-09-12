const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Проверява дали заявката има валиден JWT токен.
// Очаква хедър: Authorization: Bearer <token>
async function protect(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Няма токен. Моля, влез в профила си.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ message: 'Потребителят не съществува.' });
    }

    // Запазваме потребителя в заявката за следващите функции
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Невалиден или изтекъл токен.' });
  }
}

// Проверява дали потребителят има една от позволените роли.
// Пример: requireRole('admin') или requireRole('artist', 'admin')
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Нямаш права за това действие.' });
    }
    next();
  };
}

module.exports = { protect, requireRole };
