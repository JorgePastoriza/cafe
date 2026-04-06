// src/models/Sale.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Sale = sequelize.define('Sale', {
  id: { 
    type: DataTypes.INTEGER, 
    primaryKey: true, 
    autoIncrement: true 
  },
  sale_number: { 
    type: DataTypes.STRING(30), 
    allowNull: false, 
    unique: true 
  },
  user_id: { 
    type: DataTypes.INTEGER, 
    allowNull: false 
  },
  payment_method: {
    type: DataTypes.ENUM('efectivo', 'qr', 'debito', 'delivery'),
    allowNull: false,
    comment: 'delivery = venta con recargo por envío'
  },
  
  // ============================================================
  // CAMPOS NUEVOS - DELIVERY SURCHARGE
  // ============================================================
  delivery_surcharge_pct: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 0.00,
    comment: 'Snapshot del % de recargo al momento de la venta (ej: 10.00 = 10%)'
  },
  delivery_surcharge_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
    comment: 'Monto del recargo en pesos (calculado = subtotal * pct / 100)'
  },
  subtotal_before_surcharge: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
    comment: 'Subtotal de los productos antes de aplicar el recargo'
  },
  // ============================================================
  
  total: { 
    type: DataTypes.DECIMAL(10, 2), 
    allowNull: false,
    comment: 'Total final = subtotal_before_surcharge + delivery_surcharge_amount'
  },
  status: { 
    type: DataTypes.ENUM('completed', 'cancelled'), 
    defaultValue: 'completed' 
  },
  closure_id: { 
    type: DataTypes.INTEGER 
  }
}, { 
  tableName: 'sales' 
});

/**
 * Método helper para calcular el recargo de delivery
 * @param {number} subtotal - Subtotal de productos
 * @param {number} surchargePct - Porcentaje de recargo (ej: 10.00 para 10%)
 * @returns {Object} { subtotal, pct, amount, total }
 */
Sale.calculateDeliverySurcharge = function(subtotal, surchargePct) {
  const pct = parseFloat(surchargePct) || 0;
  const amount = parseFloat(((subtotal * pct) / 100).toFixed(2));
  const total = parseFloat((subtotal + amount).toFixed(2));
  
  return {
    subtotal_before_surcharge: parseFloat(subtotal.toFixed(2)),
    delivery_surcharge_pct: parseFloat(pct.toFixed(2)),
    delivery_surcharge_amount: amount,
    total: total
  };
};

/**
 * Método helper para verificar si una venta es delivery
 * @returns {boolean}
 */
Sale.prototype.isDelivery = function() {
  return this.payment_method === 'delivery';
};

/**
 * Método helper para obtener el detalle del recargo
 * @returns {Object|null}
 */
Sale.prototype.getSurchargeDetails = function() {
  if (!this.isDelivery() || this.delivery_surcharge_amount <= 0) {
    return null;
  }
  
  return {
    percentage: parseFloat(this.delivery_surcharge_pct),
    amount: parseFloat(this.delivery_surcharge_amount),
    subtotal: parseFloat(this.subtotal_before_surcharge),
    total: parseFloat(this.total)
  };
};

/**
 * Método helper para buscar ventas de un período con filtros
 * @param {Object} filters - { from, to, payment_method, status }
 * @returns {Promise<Array<Sale>>}
 */
Sale.findByPeriod = async function(filters = {}) {
  const { Op } = require('sequelize');
  const where = {};
  
  if (filters.status) {
    where.status = filters.status;
  } else {
    where.status = 'completed'; // Por defecto solo completadas
  }
  
  if (filters.payment_method) {
    where.payment_method = filters.payment_method;
  }
  
  if (filters.from || filters.to) {
    where.created_at = {};
    if (filters.from) {
      where.created_at[Op.gte] = `${filters.from} 00:00:00`;
    }
    if (filters.to) {
      where.created_at[Op.lte] = `${filters.to} 23:59:59`;
    }
  }
  
  return await Sale.findAll({
    where,
    order: [['created_at', 'DESC']],
    include: filters.include || []
  });
};

/**
 * Método helper para obtener estadísticas de un período
 * @param {string} from - Fecha inicio (YYYY-MM-DD)
 * @param {string} to - Fecha fin (YYYY-MM-DD)
 * @returns {Promise<Object>} Estadísticas agregadas
 */
Sale.getStatsByPeriod = async function(from, to) {
  const sales = await Sale.findByPeriod({ from, to, status: 'completed' });
  
  const stats = {
    total_sales: sales.length,
    total_amount: 0,
    total_efectivo: 0,
    total_qr: 0,
    total_debito: 0,
    total_delivery: 0,
    total_surcharge: 0,
    delivery_count: 0
  };
  
  sales.forEach(sale => {
    const amount = parseFloat(sale.total);
    stats.total_amount += amount;
    
    // Por método de pago
    if (sale.payment_method === 'efectivo') {
      stats.total_efectivo += amount;
    } else if (sale.payment_method === 'qr') {
      stats.total_qr += amount;
    } else if (sale.payment_method === 'debito') {
      stats.total_debito += amount;
    } else if (sale.payment_method === 'delivery') {
      stats.total_delivery += amount;
      stats.total_surcharge += parseFloat(sale.delivery_surcharge_amount);
      stats.delivery_count++;
    }
  });
  
  return stats;
};

module.exports = Sale;
