// src/models/User.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  id: { 
    type: DataTypes.INTEGER, 
    primaryKey: true, 
    autoIncrement: true 
  },
  name: { 
    type: DataTypes.STRING(100), 
    allowNull: false 
  },
  email: { 
    type: DataTypes.STRING(150), 
    allowNull: false, 
    unique: true, 
    validate: { 
      isEmail: true 
    } 
  },
  password: { 
    type: DataTypes.STRING(255), 
    allowNull: false 
  },
  role_id: { 
    type: DataTypes.INTEGER, 
    allowNull: false 
  },
  active: { 
    type: DataTypes.BOOLEAN, 
    defaultValue: true 
  }
}, {
  tableName: 'users',
  hooks: {
    // Hook antes de crear un usuario - hashea la contraseña
    beforeCreate: async (user) => {
      if (user.password) {
        user.password = await bcrypt.hash(user.password, 10);
      }
    },
    
    // Hook antes de actualizar - hashea solo si la contraseña cambió
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        // Verificar si ya está hasheada (empieza con $2a, $2b o $2y)
        const isAlreadyHashed = user.password.startsWith('$2');
        if (!isAlreadyHashed) {
          user.password = await bcrypt.hash(user.password, 10);
        }
      }
    }
  }
});

/**
 * Método de instancia para validar contraseña
 * @param {string} password - Contraseña en texto plano
 * @returns {Promise<boolean>} true si la contraseña es correcta
 */
User.prototype.validatePassword = async function(password) {
  return bcrypt.compare(password, this.password);
};

/**
 * Método helper para buscar usuario por email
 * @param {string} email - Email del usuario
 * @returns {Promise<User|null>} Usuario encontrado o null
 */
User.findByEmail = async function(email) {
  return await User.findOne({ where: { email } });
};

/**
 * Método helper para buscar usuarios activos
 * @param {Object} options - Opciones de búsqueda
 * @returns {Promise<Array<User>>} Array de usuarios activos
 */
User.findActive = async function(options = {}) {
  return await User.findAll({ 
    where: { active: true },
    ...options 
  });
};

module.exports = User;
