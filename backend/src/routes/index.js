// src/routes/index.js
const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');

// Controllers
const authCtrl = require('../controllers/authController');
const configCtrl = require('../controllers/configController');
const productCtrl = require('../controllers/productController');
const categoryCtrl = require('../controllers/categoriesController');
const salesCtrl = require('../controllers/salesController');
const dashCtrl = require('../controllers/dashboardController');
const usersCtrl = require('../controllers/usersController');
const stockCtrl = require('../controllers/stockController');
const cierreCtrl = require('../controllers/cierreController');

// ============================================================
// HEALTH CHECK
// ============================================================
router.get('/health', (_, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// ============================================================
// AUTENTICACIÓN (sin autenticación requerida)
// ============================================================
router.post('/auth/login', authCtrl.login);

// Usuario autenticado
router.get('/auth/me', authenticate, authCtrl.me);

// ============================================================
// CONFIGURACIÓN
// ============================================================
// Obtener configuración (todos los usuarios autenticados)
router.get('/config', authenticate, configCtrl.getConfig);

// Actualizar configuración (solo admin)
router.put('/config', authenticate, authorize('admin'), configCtrl.updateConfig);

// Obtener toda la configuración - avanzado (solo admin)
router.get('/config/all', authenticate, authorize('admin'), configCtrl.getAllConfig);

// ============================================================
// PRODUCTOS
// ============================================================
router.get('/products', authenticate, productCtrl.getAll);
router.get('/products/:id', authenticate, productCtrl.getById);
router.post('/products', authenticate, authorize('admin'), productCtrl.create);
router.put('/products/:id', authenticate, authorize('admin'), productCtrl.update);
router.delete('/products/:id', authenticate, authorize('admin'), productCtrl.remove);

// ============================================================
// CATEGORÍAS
// ============================================================
router.get('/categories', authenticate, categoryCtrl.getAll);
router.post('/categories', authenticate, authorize('admin'), categoryCtrl.create);
router.put('/categories/:id', authenticate, authorize('admin'), categoryCtrl.update);
router.delete('/categories/:id', authenticate, authorize('admin'), categoryCtrl.remove);

// ============================================================
// VENTAS
// ============================================================
// Crear venta (todos los usuarios autenticados)
router.post('/sales', authenticate, salesCtrl.create);

// Ver ventas (solo admin)
router.get('/sales', authenticate, authorize('admin'), salesCtrl.getAll);
router.get('/sales/:id', authenticate, salesCtrl.getById);

// ============================================================
// STOCK
// ============================================================
// Ajustar stock (solo admin)
router.post('/stock/adjust', authenticate, authorize('admin'), stockCtrl.adjustStock);

// Ver movimientos (solo admin)
router.get('/stock/movements', authenticate, authorize('admin'), stockCtrl.getMovements);

// ============================================================
// CIERRE DIARIO
// ============================================================
// Ver resumen del día (todos los usuarios autenticados)
router.get('/cierre/today', authenticate, cierreCtrl.getToday);

// Cerrar el día (todos los usuarios autenticados)
router.post('/cierre/close', authenticate, cierreCtrl.close);

// Ver historial de cierres (solo admin)
router.get('/cierre/history', authenticate, authorize('admin'), cierreCtrl.getHistory);

// ============================================================
// DASHBOARD (solo admin)
// ============================================================
router.get('/dashboard/stats', authenticate, authorize('admin'), dashCtrl.getStats);
router.get('/dashboard/chart', authenticate, authorize('admin'), dashCtrl.getSalesChart);
router.get('/dashboard/top-products', authenticate, authorize('admin'), dashCtrl.getTopProducts);

// ============================================================
// USUARIOS (solo admin)
// ============================================================
router.get('/users', authenticate, authorize('admin'), usersCtrl.getAll);
router.post('/users', authenticate, authorize('admin'), usersCtrl.create);
router.put('/users/:id', authenticate, authorize('admin'), usersCtrl.update);
router.delete('/users/:id', authenticate, authorize('admin'), usersCtrl.remove);

// Roles (solo admin)
router.get('/roles', authenticate, authorize('admin'), usersCtrl.getRoles);

// ============================================================
// RUTA NO ENCONTRADA
// ============================================================
router.use('*', (req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

module.exports = router;
