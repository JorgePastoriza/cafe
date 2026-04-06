// src/controllers/configController.js
const { Config } = require('../models');

/**
 * GET /api/config
 * Obtiene la configuración del sistema (accesible por todos los usuarios autenticados)
 */
const getConfig = async (req, res) => {
  try {
    // Obtener las configuraciones más comunes
    const configs = await Config.getMultiple([
      'delivery_surcharge',
      'business_name'
    ]);

    res.json({
      delivery_surcharge: parseFloat(configs.delivery_surcharge || '0'),
      business_name: configs.business_name || 'Mi Cafetería'
    });
  } catch (error) {
    console.error('getConfig error:', error);
    res.status(500).json({ error: 'Error al obtener configuración' });
  }
};

/**
 * PUT /api/config
 * Actualiza la configuración del sistema (solo admin)
 */
const updateConfig = async (req, res) => {
  try {
    const { delivery_surcharge, business_name } = req.body;
    const updates = {};

    // Validar y actualizar delivery_surcharge
    if (delivery_surcharge !== undefined) {
      const pct = parseFloat(delivery_surcharge);
      
      if (isNaN(pct)) {
        return res.status(400).json({ 
          error: 'El recargo debe ser un número válido' 
        });
      }
      
      if (pct < 0 || pct > 100) {
        return res.status(400).json({ 
          error: 'El recargo debe estar entre 0 y 100' 
        });
      }

      await Config.setValue(
        'delivery_surcharge', 
        pct.toFixed(2),
        'Porcentaje de recargo para ventas delivery'
      );
      
      updates.delivery_surcharge = pct;
    }

    // Actualizar business_name
    if (business_name !== undefined && business_name.trim()) {
      await Config.setValue(
        'business_name',
        business_name.trim(),
        'Nombre del negocio'
      );
      
      updates.business_name = business_name.trim();
    }

    // Retornar configuración actualizada
    const configs = await Config.getMultiple([
      'delivery_surcharge',
      'business_name'
    ]);

    res.json({
      message: 'Configuración actualizada correctamente',
      config: {
        delivery_surcharge: parseFloat(configs.delivery_surcharge || '0'),
        business_name: configs.business_name || 'Mi Cafetería'
      }
    });
  } catch (error) {
    console.error('updateConfig error:', error);
    res.status(500).json({ error: 'Error al actualizar configuración' });
  }
};

/**
 * GET /api/config/all
 * Obtiene TODA la configuración del sistema (solo admin, para debug/advanced settings)
 */
const getAllConfig = async (req, res) => {
  try {
    const allConfig = await Config.getAll();
    res.json(allConfig);
  } catch (error) {
    console.error('getAllConfig error:', error);
    res.status(500).json({ error: 'Error al obtener configuración completa' });
  }
};

module.exports = {
  getConfig,
  updateConfig,
  getAllConfig
};
