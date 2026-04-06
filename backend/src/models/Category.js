// src/models/Category.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Category = sequelize.define('Category', {
  id: { 
    type: DataTypes.INTEGER, 
    primaryKey: true, 
    autoIncrement: true 
  },
  name: { 
    type: DataTypes.STRING(100), 
    allowNull: false,
    unique: true // Nombre único a nivel global
  },
  type: { 
    type: DataTypes.ENUM('cafe', 'comida'), 
    allowNull: false 
  },
  icon: { 
    type: DataTypes.STRING(10), 
    defaultValue: '☕' 
  },
  active: { 
    type: DataTypes.BOOLEAN, 
    defaultValue: true 
  }
}, { 
  tableName: 'categories'
});

/**
 * Método helper para buscar categorías por tipo
 * @param {string} type - 'cafe' o 'comida'
 * @returns {Promise<Array<Category>>}
 */
Category.findByType = async function(type) {
  return await Category.findAll({
    where: { type, active: true },
    order: [['name', 'ASC']]
  });
};

/**
 * Método helper para buscar categorías activas
 * @param {Object} options - Opciones adicionales de búsqueda
 * @returns {Promise<Array<Category>>}
 */
Category.findActive = async function(options = {}) {
  return await Category.findAll({
    where: { active: true },
    order: [['name', 'ASC']],
    ...options
  });
};

/**
 * Método helper para verificar si existe una categoría con ese nombre
 * @param {string} name - Nombre de la categoría
 * @param {number} excludeId - ID a excluir (útil en updates)
 * @returns {Promise<boolean>}
 */
Category.nameExists = async function(name, excludeId = null) {
  const { Op } = require('sequelize');
  const where = { name };
  
  if (excludeId) {
    where.id = { [Op.ne]: excludeId };
  }
  
  const count = await Category.count({ where });
  return count > 0;
};

module.exports = Category;
