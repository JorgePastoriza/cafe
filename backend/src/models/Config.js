// src/models/Config.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Config = sequelize.define('Config', {
  id: { 
    type: DataTypes.INTEGER, 
    primaryKey: true, 
    autoIncrement: true 
  },
  config_key: { 
    type: DataTypes.STRING(100), 
    allowNull: false, 
    unique: true 
  },
  config_value: { 
    type: DataTypes.TEXT, 
    allowNull: false 
  },
  description: { 
    type: DataTypes.STRING(255) 
  }
}, { 
  tableName: 'config',
  timestamps: false, // Solo tenemos updated_at, no created_at
  updatedAt: 'updated_at'
});

/**
 * Método helper para obtener un valor de configuración
 * @param {string} key - Clave de configuración
 * @param {any} defaultValue - Valor por defecto si no existe
 * @returns {Promise<string|null>} Valor de configuración
 */
Config.getValue = async function(key, defaultValue = null) {
  try {
    const config = await Config.findOne({ where: { config_key: key } });
    return config ? config.config_value : defaultValue;
  } catch (error) {
    console.error(`Error getting config ${key}:`, error);
    return defaultValue;
  }
};

/**
 * Método helper para establecer un valor de configuración
 * Crea el registro si no existe, lo actualiza si ya existe
 * @param {string} key - Clave de configuración
 * @param {string} value - Valor a guardar
 * @param {string} description - Descripción opcional
 * @returns {Promise<Object>} Objeto de configuración creado/actualizado
 */
Config.setValue = async function(key, value, description = null) {
  try {
    const [config, created] = await Config.findOrCreate({
      where: { config_key: key },
      defaults: {
        config_key: key,
        config_value: String(value),
        description
      }
    });

    if (!created) {
      await config.update({ 
        config_value: String(value),
        ...(description && { description })
      });
    }

    return config;
  } catch (error) {
    console.error(`Error setting config ${key}:`, error);
    throw error;
  }
};

/**
 * Método helper para obtener múltiples configuraciones a la vez
 * @param {Array<string>} keys - Array de claves
 * @returns {Promise<Object>} Objeto con key-value pairs
 */
Config.getMultiple = async function(keys) {
  try {
    const configs = await Config.findAll({
      where: { config_key: keys }
    });

    const result = {};
    configs.forEach(config => {
      result[config.config_key] = config.config_value;
    });

    // Llenar con null los que no existen
    keys.forEach(key => {
      if (!(key in result)) {
        result[key] = null;
      }
    });

    return result;
  } catch (error) {
    console.error('Error getting multiple configs:', error);
    return {};
  }
};

/**
 * Método helper para obtener todas las configuraciones
 * @returns {Promise<Object>} Objeto con todas las configuraciones
 */
Config.getAll = async function() {
  try {
    const configs = await Config.findAll();
    const result = {};
    
    configs.forEach(config => {
      result[config.config_key] = {
        value: config.config_value,
        description: config.description
      };
    });

    return result;
  } catch (error) {
    console.error('Error getting all configs:', error);
    return {};
  }
};

/**
 * Método helper para eliminar una configuración
 * @param {string} key - Clave de configuración
 * @returns {Promise<boolean>} true si se eliminó, false si no existía
 */
Config.deleteKey = async function(key) {
  try {
    const deleted = await Config.destroy({ where: { config_key: key } });
    return deleted > 0;
  } catch (error) {
    console.error(`Error deleting config ${key}:`, error);
    return false;
  }
};

module.exports = Config;
