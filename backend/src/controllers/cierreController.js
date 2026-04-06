// src/controllers/cierreController.js
const { Sale, DailyClosure, SaleItem, Product, User } = require('../models');
const { Op } = require('sequelize');

const getLocalDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getToday = async (req, res) => {
  try {
    const today = getLocalDateString();

    const closure = await DailyClosure.findOne({ where: { date: today } });

    const sales = await Sale.findAll({
      where: {
        status: 'completed',
        created_at: {
          [Op.between]: [`${today} 00:00:00`, `${today} 23:59:59`]
        }
      },
      include: [{ model: SaleItem, as: 'items' }]
    });

      const summary = {
          efectivo: 0, qr: 0, debito: 0, delivery: 0,
          delivery_surcharge_total: 0,
          total: 0, count: sales.length
      };

      sales.forEach(s => {
          const amount = parseFloat(s.total);

          // Por método de pago
          if (s.payment_method === 'efectivo') summary.efectivo += amount;
          else if (s.payment_method === 'qr') summary.qr += amount;
          else if (s.payment_method === 'debito') summary.debito += amount;
          else if (s.payment_method === 'delivery') {
              summary.delivery += amount;
              summary.delivery_surcharge_total += parseFloat(s.delivery_surcharge_amount || 0);
          }

          summary.total += amount;
      });

    // Top productos del día
    const productMap = {};
    sales.forEach(sale => {
      sale.items?.forEach(item => {
        if (!productMap[item.product_id]) {
          productMap[item.product_id] = {
            id: item.product_id,
            name: item.product_name,
            quantity: 0,
            total: 0
          };
        }
        productMap[item.product_id].quantity += item.quantity;
        productMap[item.product_id].total += parseFloat(item.subtotal);
      });
    });

    const topProducts = Object.values(productMap)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    res.json({
      closure,
      sales,
      summary,
      topProducts,
      isClosed: !!closure,
      date: today
    });
  } catch (e) {
    console.error('Cierre getToday error:', e);
    res.status(500).json({ error: 'Error al obtener cierre' });
  }
};

const close = async (req, res) => {
  try {
    const today = getLocalDateString();

    const existing = await DailyClosure.findOne({ where: { tenant_id: tid, date: today } });
    if (existing) return res.status(400).json({ error: 'La caja ya fue cerrada hoy' });

    const sales = await Sale.findAll({
      where: {
        tenant_id: tid,
        status: 'completed',
        created_at: {
          [Op.between]: [`${today} 00:00:00`, `${today} 23:59:59`]
        }
      }
    });

      const totals = { efectivo: 0, qr: 0, debito: 0, delivery: 0 };
      let totalAmount = 0;

      sales.forEach(s => {
          const amount = parseFloat(s.total);
          if (s.payment_method in totals) totals[s.payment_method] += amount;
          totalAmount += amount;
      });

      const closure = await DailyClosure.create({
          date: today,
          closed_by: req.user.id,
          total_cash: totals.efectivo,
          total_qr: totals.qr,
          total_debit: totals.debito,
          total_delivery: totals.delivery,
          total_sales: sales.length,
          total_amount: totalAmount,
          notes: req.body.notes || ''
      });

    await Sale.update(
      { closure_id: closure.id },
      {
        where: {
          status: 'completed',
          created_at: {
            [Op.between]: [`${today} 00:00:00`, `${today} 23:59:59`]
          }
        }
      }
    );

    res.json(closure);
  } catch (e) {
    console.error('Cierre close error:', e);
    res.status(500).json({ error: 'Error al cerrar caja' });
  }
};

const getHistory = async (req, res) => {
  try {
    const closures = await DailyClosure.findAll({
      where: {  },
      order: [['date', 'DESC']],
      limit: 30
    });
    res.json(closures);
  } catch (e) {
    res.status(500).json({ error: 'Error al obtener historial' });
  }
};

module.exports = { getToday, close, getHistory };
