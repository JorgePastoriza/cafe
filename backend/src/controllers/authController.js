// src/controllers/authController.js
const jwt = require('jsonwebtoken');
const { User, Role } = require('../models');

/** POST /api/:slug/auth/login */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email y contraseña requeridos' });

    const user = await User.findOne({
      where: { email, active: true },
      include: [{ model: Role, as: 'role' }]
    });

    if (!user || !(await user.validatePassword(password))) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

      const token = jwt.sign(
          { id: user.id, email: user.email, role: user.role.name },
          process.env.JWT_SECRET,
          { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
      );

      res.json({
          token,
          user: { id: user.id, name: user.name, email: user.email, role: user.role.name }
      });

  } catch (e) {
    console.error('Login error:', e);
    res.status(500).json({ error: 'Error interno' });
  }
};

/** GET /api/auth/me */
const me = (req, res) => {
    res.json({
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role.name
    });
};

/** GET /api/tenant-info/:slug - Datos públicos para pantalla de login */

module.exports = { login, me };
