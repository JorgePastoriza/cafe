// src/middleware/auth.js
const jwt = require('jsonwebtoken');
const { User, Role } = require('../models');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer '))
      return res.status(401).json({ error: 'Token no proporcionado' });

    const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);

    const user = await User.findByPk(decoded.id, {
      include: [{ model: Role, as: 'role' }]
    });
    if (!user || !user.active) return res.status(401).json({ error: 'Usuario no autorizado' });
    req.user = user;
    next();
  } catch (e) {
    return res.status(401).json({ error: e.name === 'TokenExpiredError' ? 'Token expirado' : 'Token inválido' });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role.name))
    return res.status(403).json({ error: 'Permisos insuficientes' });
  next();
};

module.exports = { authenticate, authorize };
