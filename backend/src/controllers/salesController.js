// src/controllers/salesController.js
const { Sale, SaleItem, Product, User, StockMovement, DailyClosure, Config } = require('../models');
const { Op } = require('sequelize');

const getLocalDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const generateSaleNumber = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    const secs = String(now.getSeconds()).padStart(2, '0');
    return `CAFE-${year}${month}${day}-${hours}${mins}${secs}`;
    // O dinámico: const prefix = await Config.getValue('sale_prefix', 'CAFE');
};

const create = async (req, res) => {
  const { sequelize } = require('../models');
  const t = await sequelize.transaction();
  try {
      const { items, payment_method } = req.body;

    if (!items?.length) {
      await t.rollback();
      return res.status(400).json({ error: 'El carrito está vacío' });
    }
    if (!payment_method) {
      await t.rollback();
      return res.status(400).json({ error: 'Método de pago requerido' });
    }
    //if (!['local', 'delivery'].includes(delivery_type)) {
      //await t.rollback();
     // return res.status(400).json({ error: 'Modalidad de entrega inválida' });
    //}

    // Verificar cierre del día
    const today = getLocalDateString();
    const closure = await DailyClosure.findOne({
      where: {date: today },
      transaction: t
    });
    if (closure) {
      await t.rollback();
      return res.status(400).json({
        error: `La caja ya fue cerrada hoy (${today}). Podés volver a operar mañana.`
      });
    }

      // Obtener configuración de delivery
      const isDelivery = payment_method === 'delivery';
      const deliverySurchargePct = isDelivery
          ? parseFloat(await Config.getValue('delivery_surcharge', '0'))
          : 0;

    // Calcular subtotal de productos
    let subtotalProducts = 0;
    const saleItems = [];

    for (const item of items) {
      const product = await Product.findOne({
        where: { id: item.product_id, active: true },
        transaction: t,
        lock: true
      });
      if (!product) {
        await t.rollback();
        return res.status(400).json({ error: `Producto ${item.product_id} no encontrado` });
      }
      if (product.stock < item.quantity) {
        await t.rollback();
        return res.status(400).json({ error: `Stock insuficiente para ${product.name}` });
      }

      const subtotal = parseFloat(product.price) * item.quantity;
      subtotalProducts += subtotal;
      saleItems.push({ product, quantity: item.quantity, subtotal, price: product.price });
    }

    // Calcular recargo delivery
    const deliverySurchargeAmount = parseFloat(
      ((subtotalProducts * deliverySurchargePct) / 100).toFixed(2)
    );
    const totalFinal = parseFloat((subtotalProducts + deliverySurchargeAmount).toFixed(2));

    // Crear la venta
      const sale = await Sale.create({
          sale_number: generateSaleNumber(),
          user_id: req.user.id,
          payment_method,
          delivery_surcharge_pct: deliverySurchargePct,
          delivery_surcharge_amount: deliverySurchargeAmount,
          subtotal_before_surcharge: subtotalProducts,
          total: totalFinal,
          status: 'completed'
      }, { transaction: t });

    // Crear ítems y descontar stock
    for (const item of saleItems) {
      await SaleItem.create({
        sale_id: sale.id,
        product_id: item.product.id,
        product_name: item.product.name,
        product_price: item.price,
        quantity: item.quantity,
        subtotal: item.subtotal
      }, { transaction: t });

      const prevStock = item.product.stock;
      await item.product.update({ stock: prevStock - item.quantity }, { transaction: t });

      await StockMovement.create({
        product_id: item.product.id,
        type: 'sale',
        quantity: -item.quantity,
        previous_stock: prevStock,
        new_stock: prevStock - item.quantity,
        user_id: req.user.id,
        sale_id: sale.id
      }, { transaction: t });
    }

    await t.commit();

    res.status(201).json({
      ...sale.toJSON(),
      items: saleItems.length,
      // Info útil para el frontend
      delivery_info: {
          is_delivery: isDelivery,
        surcharge_pct: deliverySurchargePct,
        surcharge_amount: deliverySurchargeAmount,
        subtotal_products: subtotalProducts,
        total_final: totalFinal
      }
    });
  } catch (e) {
    await t.rollback();
    console.error('Sale create error:', e);
    res.status(500).json({ error: 'Error al procesar la venta' });
  }
};

const getAll = async (req, res) => {
  try {
      const { date, from, to, payment_method, delivery_type, page = 1, limit = 100 } = req.query;
      const where = { status: 'completed' };

    if (date) {
      where.created_at = { [Op.between]: [`${date} 00:00:00`, `${date} 23:59:59`] };
    } else if (from && to) {
      where.created_at = { [Op.between]: [`${from} 00:00:00`, `${to} 23:59:59`] };
    } else if (from) {
      where.created_at = { [Op.gte]: `${from} 00:00:00` };
    }

    if (payment_method) where.payment_method = payment_method;

    const sales = await Sale.findAll({
      where,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      include: [
        { model: User, as: 'user', attributes: ['id', 'name'] },
        { model: SaleItem, as: 'items' }
      ],
      order: [['created_at', 'DESC']]
    });
    res.json(sales);
  } catch (e) {
    console.error('Sales getAll error:', e);
    res.status(500).json({ error: 'Error al obtener ventas' });
  }
};

const getById = async (req, res) => {
  try {
      const sale = await Sale.findOne({
          where: { id: req.params.id },
          include: [
              { model: User, as: 'user', attributes: ['id', 'name'] },
              { model: SaleItem, as: 'items' }
          ]
      });
    if (!sale) return res.status(404).json({ error: 'Venta no encontrada' });
    res.json(sale);
  } catch (e) {
    res.status(500).json({ error: 'Error al obtener venta' });
  }
};

module.exports = { create, getAll, getById };
