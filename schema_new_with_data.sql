-- ============================================================
-- CAFETERÍA POS - Schema Single Tenant
-- Versión simplificada sin multi-tenancy
-- ============================================================

CREATE DATABASE IF NOT EXISTS cafeteria_pos CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE cafeteria_pos;

-- ============================================================
-- TABLA: roles
-- ============================================================
CREATE TABLE IF NOT EXISTS roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  description VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLA: users
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role_id INT NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_id);

-- ============================================================
-- TABLA: categories
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  type ENUM('cafe', 'comida') NOT NULL,
  icon VARCHAR(10) DEFAULT '☕',
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_categories_type ON categories(type);

-- ============================================================
-- TABLA: products
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  stock INT NOT NULL DEFAULT 0,
  stock_min INT NOT NULL DEFAULT 5,
  category_id INT NOT NULL,
  type ENUM('cafe', 'comida') NOT NULL,
  image_url VARCHAR(500),
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
  CONSTRAINT chk_price CHECK (price >= 0),
  CONSTRAINT chk_stock CHECK (stock >= 0)
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_type ON products(type);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);

-- ============================================================
-- TABLA: config
-- ============================================================
CREATE TABLE IF NOT EXISTS config (
  id INT AUTO_INCREMENT PRIMARY KEY,
  config_key VARCHAR(100) NOT NULL UNIQUE,
  config_value TEXT NOT NULL,
  description VARCHAR(255),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_config_key ON config(config_key);

-- ============================================================
-- TABLA: daily_closures
-- ============================================================
CREATE TABLE IF NOT EXISTS daily_closures (
  id INT AUTO_INCREMENT PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  closed_by INT NOT NULL,
  closed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  total_cash DECIMAL(10, 2) DEFAULT 0,
  total_qr DECIMAL(10, 2) DEFAULT 0,
  total_debit DECIMAL(10, 2) DEFAULT 0,
  total_delivery DECIMAL(10, 2) DEFAULT 0,
  total_sales INT DEFAULT 0,
  total_amount DECIMAL(10, 2) DEFAULT 0,
  notes TEXT,
  FOREIGN KEY (closed_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_closures_date ON daily_closures(date);

-- ============================================================
-- TABLA: sales
-- ============================================================
CREATE TABLE IF NOT EXISTS sales (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sale_number VARCHAR(30) NOT NULL UNIQUE,
  user_id INT NOT NULL,
  payment_method ENUM('efectivo', 'qr', 'debito', 'delivery') NOT NULL,
  delivery_surcharge_pct DECIMAL(5, 2) DEFAULT 0.00 COMMENT 'Snapshot del % al momento de la venta',
  delivery_surcharge_amount DECIMAL(10, 2) DEFAULT 0.00 COMMENT 'Monto del recargo en pesos',
  subtotal_before_surcharge DECIMAL(10, 2) DEFAULT 0.00 COMMENT 'Subtotal de productos antes del recargo',
  total DECIMAL(10, 2) NOT NULL,
  status ENUM('completed', 'cancelled') DEFAULT 'completed',
  closure_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (closure_id) REFERENCES daily_closures(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_sales_number ON sales(sale_number);
CREATE INDEX IF NOT EXISTS idx_sales_user ON sales(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_created ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_payment ON sales(payment_method);

-- ============================================================
-- TABLA: sale_items
-- ============================================================
CREATE TABLE IF NOT EXISTS sale_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sale_id INT NOT NULL,
  product_id INT NOT NULL,
  product_name VARCHAR(150) NOT NULL,
  product_price DECIMAL(10, 2) NOT NULL,
  quantity INT NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
  CONSTRAINT chk_quantity CHECK (quantity > 0)
);

CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product ON sale_items(product_id);

-- ============================================================
-- TABLA: stock_movements
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_movements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  type ENUM('sale', 'adjustment', 'return') NOT NULL,
  quantity INT NOT NULL COMMENT 'Negativo = salida, Positivo = entrada',
  previous_stock INT NOT NULL,
  new_stock INT NOT NULL,
  reason VARCHAR(255),
  user_id INT NOT NULL,
  sale_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_stock_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_type ON stock_movements(type);
CREATE INDEX IF NOT EXISTS idx_stock_created ON stock_movements(created_at);


-- ============================================================
-- DATOS INICIALES (SEED)
-- Datos migrados desde Railway (tenant: Delicias Rodantes)
-- ============================================================

-- Roles
INSERT IGNORE INTO roles (id, name, description) VALUES
(1,'admin','Administrador del comercio'),
(2,'cajero','Cajero con acceso al módulo de ventas');

-- Usuarios
INSERT IGNORE INTO users (id, name, email, password, role_id) VALUES
(1,'Vanina','vaolimpo@hotmail.com','$2a$10$oN67gCbf27TpsD5d13uBKupxapoZgJEP8CTZbourpfrTFSMDSX0US',1),
(2,'Maga','maga@gmail.com','$2a$10$SKQb3PrkPNhrTA9fShROQu4lFeeo2oQGg8hdcSb27NohlDFvid0/.',2),
(3,'ALE','Ale08cappella@gmail.com','$2a$10$W/UeY.a9WHrcvYhEVJYRWuupe/d82vWuNCm3T.7JodsfdUzWw9jSa',1);

-- Configuración inicial del sistema
INSERT IGNORE INTO config (config_key, config_value, description) VALUES
('delivery_surcharge','10.00','Porcentaje de recargo para ventas con modalidad delivery (0-100)'),
('business_name','Delicias Rodantes','Nombre del negocio');

-- Categorías
INSERT IGNORE INTO categories (id, name, type, icon) VALUES
(1,'Cafe','cafe','☕'),
(2,'Bebidas','cafe','🧃'),
(3,'Comida','comida','🥐'),
(4,'Kiosko','comida','🧁');

-- Productos
INSERT IGNORE INTO products (id, name, description, price, stock, stock_min, category_id, type, image_url, active) VALUES
(1,'Infusión herbal','Té ',1500.00,50,5,2,'cafe','/images/cafe.jpg',1),
(2,'Capuccino ','Capuccino 12 oz',3000.00,45,5,1,'cafe','/images/cafe.jpg',1),
(3,'Latte','Café con leche 12oz',3000.00,43,5,1,'cafe','/images/cafe.jpg',1),
(4,'Americano','Café 12 oz',2500.00,41,5,1,'cafe','/images/cafe.jpg',1),
(5,'Agua caliente','1 litro',1000.00,50,5,1,'cafe','/images/cafe.jpg',1),
(6,'Cubanitos comunes','Unidad. Relleno de dulce de leche ',800.00,267,50,3,'comida','/images/cubanito.jpg',1),
(7,'Cubanitos comunes x6','6 unidades. ',4800.00,299,50,3,'comida','/images/cubanito.jpg',1),
(8,'Cubanitos comunes x12','12 unidades',9000.00,32,5,3,'comida','/images/cubanito.jpg',1),
(9,'Cubanitos chocolate negro','1 unidad. Bañados en chocolate negro ',1300.00,184,5,3,'comida','/images/cubanito.jpg',1),
(10,'Cubanitos chocolate negro x6','6 unidades.  Chocolate negro',7500.00,148,50,3,'comida','/images/cubanito.jpg',1),
(11,'Cubanitos chocolate negro x12','12 unidades.  Chocolate negro',15000.00,150,50,3,'comida','/images/cubanito.jpg',1),
(12,'Cubanitos chocolate blanco unidad.','1 unidad. Bañado en chocolate blanco',1300.00,144,50,3,'comida','/images/cubanito.jpg',1),
(13,'Cubanitos  chocolate blanco x6','6 unidades.  Bañados en chocolate blanco',7800.00,250,50,3,'comida','/images/cubanito.jpg',1),
(14,'Cubanitos chocolate blanco x 12','12 unidades.  Bañado en chocolate blanco',15000.00,32,2,3,'comida','/images/cubanito.jpg',1),
(15,'Cubanito sin tacc','Cubanito varios sabores. Sin Tacc',1300.00,38,5,3,'comida','/images/cubanito.jpg',1),
(16,'Cubanitos vegano','Varios sabores. Vegano',1300.00,44,5,3,'comida','/images/cubanito.jpg',1),
(17,'Alfajor de Maicena','1 unidad. Relleno de dulce de leche ',1100.00,29,5,3,'comida','/images/medialuna.jpg',0),
(18,'Alfajor de maicena  x 6','6 unidades',2500.00,7,5,3,'comida','/images/medialuna.jpg',1),
(19,'Chipá','250gr. 12 unidades',6000.00,21,5,3,'comida','/images/medialuna.jpg',1),
(20,'Coca cola 500',NULL,2300.00,13,5,2,'cafe','/images/gaseosa.jpg',1),
(21,'Sprite 500',NULL,2300.00,15,6,2,'cafe','/images/gaseosa.jpg',1),
(22,'Fanta 500',NULL,2300.00,8,4,2,'cafe','/images/gaseosa.jpg',1),
(23,'Aquarius 500','Varios sabores',2100.00,20,5,2,'cafe','/images/gaseosa.jpg',1),
(24,'Agua mineral 500',NULL,1800.00,16,2,2,'cafe','/images/gaseosa.jpg',1),
(25,'Powerade 500','Varios sabores ',2500.00,14,5,2,'cafe','/images/gaseosa.jpg',1),
(26,'Cepita 200','Varios saboes',1000.00,21,2,2,'cafe','/images/gaseosa.jpg',1),
(27,'Monster energy ','Varios sabores ',3200.00,4,3,2,'cafe','/images/gaseosa.jpg',1),
(28,'Barra de arroz sin tacc','Si tacc',1850.00,20,5,4,'comida','/images/varios.jpg',1),
(29,'Pastelitos','Unidad',1790.00,4,2,3,'comida','/images/medialuna.jpg',1),
(30,'Pastelitos x 6','6 unidades ',10700.00,5,5,3,'comida','/images/medialuna.jpg',1),
(31,'Oreos','Paquete ',2300.00,3,3,4,'comida','/images/varios.jpg',1),
(32,'Mini oreos','Mini',1250.00,1,3,4,'comida','/images/varios.jpg',1),
(33,'Pepitos','Paquete ',2100.00,2,3,4,'comida','/images/varios.jpg',1),
(34,'Mini pepitos ','Mini',1250.00,5,3,4,'comida','/images/varios.jpg',1),
(35,'Sonrisas','Paquete ',1500.00,6,3,4,'comida','/images/varios.jpg',1),
(36,'Tostado jyq','Tostado o sandwich ',3000.00,4,1,3,'comida','/images/medialuna.jpg',1),
(37,'Medialunas dulces 1 unidad','1 unidad',1000.00,80,10,3,'comida','/images/medialuna.jpg',1),
(38,'Medialunas x 6','X 6 ',5900.00,139,10,3,'comida','/images/medialuna.jpg',1),
(39,'Cerealitas clásicas','Paquete',2250.00,6,2,4,'comida','/images/varios.jpg',1),
(40,'Barra de cereal con chocolate','Chocolate',1000.00,16,5,4,'comida','/images/varios.jpg',1),
(41,'Barra de cereal frutos rojos con yogurt',NULL,1000.00,12,5,4,'comida','/images/varios.jpg',1),
(42,'Barra de cereal manzana ',NULL,1000.00,17,5,4,'comida','/images/varios.jpg',1),
(43,'Saladix pizza',NULL,1600.00,1,3,4,'comida','/images/varios.jpg',1),
(44,'Saladix jamon',NULL,1600.00,4,3,4,'comida','/images/varios.jpg',1),
(45,'Saladix calabresa',NULL,1600.00,4,3,4,'comida','/images/varios.jpg',1),
(46,'Saladix jyq','Jamón y queso',1600.00,2,3,4,'comida','/images/varios.jpg',1),
(47,'Cerealitas arroz','Sin tacc',3250.00,6,2,4,'comida','/images/varios.jpg',1),
(48,'Cerealitas salvado',NULL,2250.00,5,2,4,'comida','/images/varios.jpg',1),
(49,'Chicle topline strong','Strong ',450.00,15,5,4,'comida','/images/varios.jpg',0),
(50,'Chicle strong',NULL,450.00,14,5,4,'comida','/images/varios.jpg',1),
(51,'Chicle menta',NULL,450.00,16,5,4,'comida','/images/varios.jpg',1),
(52,'Gomitas frutales','Mogul',600.00,7,3,4,'comida','/images/varios.jpg',1),
(53,'Gomitas ositos ','Mogul',600.00,8,3,4,'comida','/images/varios.jpg',1),
(54,'Gomitas tiburón ','Mogul',600.00,3,3,4,'comida','/images/varios.jpg',1),
(55,'Gomitas rellenas','Mogul',660.00,9,3,4,'comida','/images/varios.jpg',1),
(56,'Gomitas comunes','Bolsita',1500.00,29,3,4,'comida','/images/varios.jpg',1),
(57,'Masitas RUMBA',NULL,1500.00,6,3,4,'comida','/images/varios.jpg',1),
(58,'Masitas OPERA',NULL,1200.00,4,2,4,'comida','/images/varios.jpg',1),
(59,'Bonobon negro','Negro',600.00,23,5,4,'comida','/images/varios.jpg',1),
(60,'Bonobon blanco','Blanco',600.00,24,5,4,'comida','/images/varios.jpg',1),
(61,'Caramelos miel','Bolsa',1350.00,5,3,4,'comida','/images/varios.jpg',1),
(62,'Butter toffees','Bolsa',1400.00,27,5,4,'comida','/images/varios.jpg',1),
(63,'Halls pastillas strong',NULL,900.00,11,5,4,'comida','/images/varios.jpg',1),
(64,'Halls menta ','Pastillas',900.00,12,5,4,'comida','/images/varios.jpg',1),
(65,'Halls cherry','Pastillas',900.00,10,5,4,'comida','/images/varios.jpg',1),
(66,'Rocklets',NULL,1500.00,14,5,4,'comida','/images/varios.jpg',1),
(67,'Turrón',NULL,300.00,46,5,4,'comida','/images/varios.jpg',1),
(68,'Combo de alfajores y cafe','Café a elección más 6 alfajores',5200.00,9,5,1,'cafe','/images/cafe.jpg',1),
(69,'Combo café + 2 cubanitos','Café a elección más 2 cubanitos comunes',4500.00,4,5,1,'cafe','/images/cafe.jpg',1),
(70,'COMBO café + 1 pastelito','Café a elección más 1 pastelito',4600.00,9,5,1,'cafe','/images/cafe.jpg',1),
(71,'COMBO gaseosa + tostado','Gaseosa (coca, Sprite o fanta) más tostado ',5000.00,9,5,2,'cafe','/images/gaseosa.jpg',1),
(72,'1 Desayuno Resi. Medialunas','2 Medialunas y café ',0.00,27,5,1,'cafe','/images/cafe.jpg',1),
(73,'2 Desayuno Resi cubanitos','2 cubanitos y 1 café',0.00,60,5,1,'cafe','/images/cafe.jpg',1),
(74,'3 Desayuno Resi. Alfajores','2 alfajores  y 1 café',0.00,40,5,1,'cafe','/images/cafe.jpg',1),
(75,'ZPaquete de Cafe','Marcar cuando se abra cada Paquete de 1 kilo',0.00,5,2,1,'cafe','/images/cafe.jpg',1),
(76,'ZLeche sachet','Sachet de 1 litro de leche',0.00,4,1,1,'cafe','/images/cafe.jpg',1),
(77,'Z azucar','Paquete de azúcar ',0.00,5,1,1,'cafe','/images/cafe.jpg',1),
(78,'COMBO café a elección y 2 medialunas ',NULL,5000.00,12,5,1,'cafe','/images/cafe.jpg',1);

-- Ventas
INSERT IGNORE INTO sales (id, sale_number, user_id, payment_method, total, status, closure_id) VALUES
(1,'DELICIAS-RODANTES-20260316-203137',1,'efectivo',3600.00,'completed',NULL),
(2,'DELICIAS-RODANTES-20260316-213236',1,'qr',15000.00,'completed',NULL),
(3,'DELICIAS-RODANTES-20260319-180604',2,'efectivo',5200.00,'completed',NULL),
(4,'DELICIAS-RODANTES-20260408-075134',2,'efectivo',3000.00,'completed',NULL),
(5,'DELICIAS-RODANTES-20260408-104509',2,'efectivo',4400.00,'completed',NULL),
(6,'DELICIAS-RODANTES-20260408-153321',2,'efectivo',3700.00,'completed',NULL),
(7,'DELICIAS-RODANTES-20260408-160446',2,'efectivo',2900.00,'completed',NULL),
(8,'DELICIAS-RODANTES-20260408-161346',2,'efectivo',4100.00,'completed',NULL),
(9,'DELICIAS-RODANTES-20260408-164020',2,'efectivo',1300.00,'completed',NULL),
(10,'DELICIAS-RODANTES-20260408-171231',2,'efectivo',4800.00,'completed',NULL),
(11,'DELICIAS-RODANTES-20260408-171248',2,'efectivo',1800.00,'completed',NULL),
(12,'DELICIAS-RODANTES-20260408-172004',2,'efectivo',2500.00,'completed',NULL),
(13,'DELICIAS-RODANTES-20260408-175330',2,'debito',2500.00,'completed',NULL),
(14,'DELICIAS-RODANTES-20260408-182039',2,'debito',6000.00,'completed',NULL),
(15,'DELICIAS-RODANTES-20260408-185443',2,'efectivo',2500.00,'completed',NULL),
(16,'DELICIAS-RODANTES-20260409-081305',2,'debito',2500.00,'completed',NULL),
(17,'DELICIAS-RODANTES-20260409-094317',2,'efectivo',7400.00,'completed',NULL),
(18,'DELICIAS-RODANTES-20260409-100422',2,'debito',3800.00,'completed',NULL),
(19,'DELICIAS-RODANTES-20260409-105742',2,'debito',8000.00,'completed',NULL),
(20,'DELICIAS-RODANTES-20260409-105757',2,'debito',3000.00,'completed',NULL),
(21,'DELICIAS-RODANTES-20260409-105833',2,'efectivo',1600.00,'completed',NULL),
(22,'DELICIAS-RODANTES-20260409-105854',2,'efectivo',450.00,'completed',NULL),
(23,'DELICIAS-RODANTES-20260409-162855',2,'debito',10200.00,'completed',NULL),
(24,'DELICIAS-RODANTES-20260409-162921',2,'efectivo',8900.00,'completed',NULL),
(25,'DELICIAS-RODANTES-20260409-164208',2,'efectivo',4800.00,'completed',NULL),
(26,'DELICIAS-RODANTES-20260409-164845',2,'debito',3000.00,'completed',NULL),
(27,'DELICIAS-RODANTES-20260409-171023',2,'debito',1300.00,'completed',NULL),
(28,'DELICIAS-RODANTES-20260409-172247',2,'efectivo',6800.00,'completed',NULL),
(29,'DELICIAS-RODANTES-20260409-175424',2,'debito',6000.00,'completed',NULL),
(30,'DELICIAS-RODANTES-20260409-183439',2,'debito',12300.00,'completed',NULL),
(31,'DELICIAS-RODANTES-20260409-183454',2,'debito',3200.00,'completed',NULL),
(32,'DELICIAS-RODANTES-20260409-183503',2,'efectivo',2400.00,'completed',NULL),
(33,'DELICIAS-RODANTES-20260410-080911',2,'efectivo',0.00,'completed',NULL),
(34,'DELICIAS-RODANTES-20260410-093619',2,'efectivo',8500.00,'completed',NULL),
(35,'DELICIAS-RODANTES-20260410-095004',2,'debito',3000.00,'completed',NULL),
(36,'DELICIAS-RODANTES-20260410-095955',2,'debito',1800.00,'completed',NULL),
(37,'DELICIAS-RODANTES-20260410-151921',2,'efectivo',7100.00,'completed',NULL),
(38,'DELICIAS-RODANTES-20260410-160351',2,'efectivo',5180.00,'completed',NULL),
(39,'DELICIAS-RODANTES-20260410-164301',2,'efectivo',10700.00,'completed',NULL),
(40,'DELICIAS-RODANTES-20260410-172649',2,'debito',9700.00,'completed',NULL),
(41,'DELICIAS-RODANTES-20260410-172933',2,'efectivo',900.00,'completed',NULL),
(42,'DELICIAS-RODANTES-20260410-174303',2,'debito',1200.00,'completed',NULL),
(43,'DELICIAS-RODANTES-20260410-180057',2,'efectivo',4500.00,'completed',NULL),
(44,'DELICIAS-RODANTES-20260410-182923',2,'debito',12400.00,'completed',NULL),
(45,'DELICIAS-RODANTES-20260410-182940',2,'debito',5200.00,'completed',NULL),
(46,'DELICIAS-RODANTES-20260411-095046',2,'efectivo',5000.00,'completed',NULL),
(47,'DELICIAS-RODANTES-20260411-095133',2,'debito',3000.00,'completed',NULL),
(48,'DELICIAS-RODANTES-20260411-101807',2,'debito',5100.00,'completed',NULL),
(49,'DELICIAS-RODANTES-20260411-113256',2,'efectivo',1300.00,'completed',NULL),
(50,'DELICIAS-RODANTES-20260411-115107',2,'efectivo',10200.00,'completed',NULL),
(51,'DELICIAS-RODANTES-20260411-121600',2,'efectivo',2600.00,'completed',NULL),
(52,'DELICIAS-RODANTES-20260411-122625',2,'efectivo',3500.00,'completed',NULL),
(53,'DELICIAS-RODANTES-20260413-085304',2,'debito',2500.00,'completed',NULL),
(54,'DELICIAS-RODANTES-20260413-100327',2,'efectivo',4500.00,'completed',NULL),
(55,'DELICIAS-RODANTES-20260413-152725',2,'efectivo',2500.00,'completed',NULL),
(56,'DELICIAS-RODANTES-20260413-164324',2,'efectivo',13500.00,'completed',NULL),
(57,'DELICIAS-RODANTES-20260413-171754',2,'debito',3000.00,'completed',NULL),
(58,'DELICIAS-RODANTES-20260413-171840',2,'debito',6800.00,'completed',NULL),
(59,'DELICIAS-RODANTES-20260413-174713',2,'debito',2100.00,'completed',NULL),
(60,'DELICIAS-RODANTES-20260413-175744',2,'efectivo',5000.00,'completed',NULL),
(61,'DELICIAS-RODANTES-20260413-184631',2,'efectivo',1200.00,'completed',NULL),
(62,'DELICIAS-RODANTES-20260414-071643',2,'debito',7500.00,'completed',NULL),
(63,'DELICIAS-RODANTES-20260414-071658',2,'efectivo',0.00,'completed',NULL),
(64,'DELICIAS-RODANTES-20260414-072647',2,'efectivo',0.00,'completed',NULL),
(65,'DELICIAS-RODANTES-20260414-073705',2,'efectivo',0.00,'completed',NULL),
(66,'DELICIAS-RODANTES-20260414-073709',2,'efectivo',0.00,'completed',NULL),
(67,'DELICIAS-RODANTES-20260414-092041',2,'efectivo',0.00,'completed',NULL),
(68,'DELICIAS-RODANTES-20260414-092056',2,'debito',5000.00,'completed',NULL),
(69,'DELICIAS-RODANTES-20260414-102104',2,'efectivo',0.00,'completed',NULL);

-- Items de ventas
INSERT IGNORE INTO sale_items (id, sale_id, product_id, product_name, product_price, quantity, subtotal) VALUES
(1,1,17,'Alfajor de Maicena',1100.00,1,1100.00),
(2,1,4,'Americano',2500.00,1,2500.00),
(3,2,2,'Capuccino ',3000.00,1,3000.00),
(4,2,18,'Alfajor de maicena  x 6',6000.00,1,6000.00),
(5,2,19,'Chipá',6000.00,1,6000.00),
(6,3,9,'Cubanitos chocolate negro',1300.00,4,5200.00),
(7,4,2,'Capuccino ',3000.00,1,3000.00),
(8,5,70,'COMBO café + 1 pastelito',4400.00,1,4400.00),
(9,6,54,'Gomitas tiburón ',600.00,1,600.00),
(10,6,66,'Rocklets',1500.00,1,1500.00),
(11,6,43,'Saladix pizza',1600.00,1,1600.00),
(12,7,12,'Cubanitos chocolate blanco unidad.',1300.00,1,1300.00),
(13,7,6,'Cubanitos comunes',800.00,2,1600.00),
(14,8,18,'Alfajor de maicena  x 6',2500.00,1,2500.00),
(15,8,29,'Pastelitos',1600.00,1,1600.00),
(16,9,15,'Cubanito sin tacc',1300.00,1,1300.00),
(17,10,29,'Pastelitos',1600.00,3,4800.00),
(18,11,37,'Medialunas dulces 1 unidad',900.00,2,1800.00),
(19,12,4,'Americano',2500.00,1,2500.00),
(20,13,18,'Alfajor de maicena  x 6',2500.00,1,2500.00),
(21,14,19,'Chipá',6000.00,1,6000.00),
(22,15,18,'Alfajor de maicena  x 6',2500.00,1,2500.00),
(23,16,4,'Americano',2500.00,1,2500.00),
(24,17,41,'Barra de cereal frutos rojos con yogurt',1000.00,2,2000.00),
(25,17,38,'Medialunas x 6',5400.00,1,5400.00),
(26,18,4,'Americano',2500.00,1,2500.00),
(27,18,16,'Cubanitos vegano',1300.00,1,1300.00),
(28,19,18,'Alfajor de maicena  x 6',2500.00,1,2500.00),
(29,19,4,'Americano',2500.00,1,2500.00),
(30,19,3,'Latte',3000.00,1,3000.00),
(31,20,3,'Latte',3000.00,1,3000.00),
(32,21,6,'Cubanitos comunes',800.00,2,1600.00),
(33,22,50,'Chicle strong',450.00,1,450.00),
(34,23,6,'Cubanitos comunes',800.00,2,1600.00),
(35,23,9,'Cubanitos chocolate negro',1300.00,2,2600.00),
(36,23,3,'Latte',3000.00,2,6000.00),
(37,24,29,'Pastelitos',1600.00,4,6400.00),
(38,24,18,'Alfajor de maicena  x 6',2500.00,1,2500.00),
(39,25,6,'Cubanitos comunes',800.00,4,3200.00),
(40,25,44,'Saladix jamon',1600.00,1,1600.00),
(41,26,3,'Latte',3000.00,1,3000.00),
(42,27,16,'Cubanitos vegano',1300.00,1,1300.00),
(43,28,12,'Cubanitos chocolate blanco unidad.',1300.00,2,2600.00),
(44,28,9,'Cubanitos chocolate negro',1300.00,2,2600.00),
(45,28,6,'Cubanitos comunes',800.00,2,1600.00),
(46,29,2,'Capuccino ',3000.00,2,6000.00),
(47,30,10,'Cubanitos chocolate negro x6',7500.00,1,7500.00),
(48,30,7,'Cubanitos comunes x6',4800.00,1,4800.00),
(49,31,6,'Cubanitos comunes',800.00,4,3200.00),
(50,32,6,'Cubanitos comunes',800.00,3,2400.00),
(51,33,76,'ZLeche sachet',0.00,1,0.00),
(52,34,18,'Alfajor de maicena  x 6',2500.00,1,2500.00),
(53,34,19,'Chipá',6000.00,1,6000.00),
(54,35,3,'Latte',3000.00,1,3000.00),
(55,36,24,'Agua mineral 500',1800.00,1,1800.00),
(56,37,32,'Mini oreos',1250.00,2,2500.00),
(57,37,60,'Bonobon blanco',600.00,1,600.00),
(58,37,43,'Saladix pizza',1600.00,1,1600.00),
(59,37,6,'Cubanitos comunes',800.00,3,2400.00),
(60,38,29,'Pastelitos',1790.00,2,3580.00),
(61,38,6,'Cubanitos comunes',800.00,2,1600.00),
(62,39,30,'Pastelitos x 6',10700.00,1,10700.00),
(63,40,69,'Combo café + 2 cubanitos',4500.00,1,4500.00),
(64,40,68,'Combo de alfajores y cafe',5200.00,1,5200.00),
(65,41,37,'Medialunas dulces 1 unidad',900.00,1,900.00),
(66,42,58,'Masitas OPERA',1200.00,1,1200.00),
(67,43,69,'Combo café + 2 cubanitos',4500.00,1,4500.00),
(68,44,6,'Cubanitos comunes',800.00,3,2400.00),
(69,44,18,'Alfajor de maicena  x 6',2500.00,1,2500.00),
(70,44,10,'Cubanitos chocolate negro x6',7500.00,1,7500.00),
(71,45,16,'Cubanitos vegano',1300.00,4,5200.00),
(72,46,4,'Americano',2500.00,2,5000.00),
(73,47,3,'Latte',3000.00,1,3000.00),
(74,48,36,'Tostado jyq',3000.00,1,3000.00),
(75,48,23,'Aquarius 500',2100.00,1,2100.00),
(76,49,9,'Cubanitos chocolate negro',1300.00,1,1300.00),
(77,50,71,'COMBO gaseosa + tostado',5000.00,1,5000.00),
(78,50,9,'Cubanitos chocolate negro',1300.00,4,5200.00),
(79,51,12,'Cubanitos chocolate blanco unidad.',1300.00,1,1300.00),
(80,51,9,'Cubanitos chocolate negro',1300.00,1,1300.00),
(81,52,6,'Cubanitos comunes',800.00,4,3200.00),
(82,52,67,'Turrón',300.00,1,300.00),
(83,53,18,'Alfajor de maicena  x 6',2500.00,1,2500.00),
(84,54,69,'Combo café + 2 cubanitos',4500.00,1,4500.00),
(85,55,4,'Americano',2500.00,1,2500.00),
(86,56,69,'Combo café + 2 cubanitos',4500.00,3,13500.00),
(87,57,2,'Capuccino ',3000.00,1,3000.00),
(88,58,12,'Cubanitos chocolate blanco unidad.',1300.00,2,2600.00),
(89,58,9,'Cubanitos chocolate negro',1300.00,2,2600.00),
(90,58,6,'Cubanitos comunes',800.00,2,1600.00),
(91,59,33,'Pepitos',2100.00,1,2100.00),
(92,60,78,'COMBO café a elección y 2 medialunas ',5000.00,1,5000.00),
(93,61,54,'Gomitas tiburón ',600.00,2,1200.00),
(94,62,78,'COMBO café a elección y 2 medialunas ',5000.00,1,5000.00),
(95,62,4,'Americano',2500.00,1,2500.00),
(96,63,72,'1 Desayuno Resi. Medialunas',0.00,3,0.00),
(97,64,72,'1 Desayuno Resi. Medialunas',0.00,2,0.00),
(98,65,72,'1 Desayuno Resi. Medialunas',0.00,1,0.00),
(99,66,72,'1 Desayuno Resi. Medialunas',0.00,1,0.00),
(100,67,72,'1 Desayuno Resi. Medialunas',0.00,3,0.00),
(101,68,78,'COMBO café a elección y 2 medialunas ',5000.00,1,5000.00),
(102,69,72,'1 Desayuno Resi. Medialunas',0.00,3,0.00);

-- Movimientos de stock
INSERT IGNORE INTO stock_movements (id, product_id, type, quantity, previous_stock, new_stock, reason, user_id, sale_id) VALUES
(1,17,'sale',-1,30,29,NULL,1,1),
(2,4,'sale',-1,50,49,NULL,1,1),
(3,2,'sale',-1,50,49,NULL,1,2),
(4,18,'sale',-1,40,39,NULL,1,2),
(5,19,'sale',-1,10,9,NULL,1,2),
(6,9,'sale',-4,200,196,NULL,2,3),
(7,2,'sale',-1,49,48,NULL,2,4),
(8,70,'sale',-1,10,9,NULL,2,5),
(9,54,'sale',-1,6,5,NULL,2,6),
(10,66,'sale',-1,15,14,NULL,2,6),
(11,43,'sale',-1,3,2,NULL,2,6),
(12,12,'sale',-1,150,149,NULL,2,7),
(13,6,'sale',-2,300,298,NULL,2,7),
(14,18,'sale',-1,15,14,NULL,2,8),
(15,29,'sale',-1,6,5,NULL,2,8),
(16,15,'sale',-1,39,38,NULL,2,9),
(17,29,'sale',-3,5,2,NULL,2,10),
(18,37,'sale',-2,140,138,NULL,2,11),
(19,4,'sale',-1,49,48,NULL,2,12),
(20,18,'sale',-1,14,13,NULL,2,13),
(21,19,'sale',-1,9,8,NULL,2,14),
(22,18,'sale',-1,13,12,NULL,2,15),
(23,4,'sale',-1,48,47,NULL,2,16),
(24,41,'sale',-2,14,12,NULL,2,17),
(25,38,'sale',-1,140,139,NULL,2,17),
(26,4,'sale',-1,47,46,NULL,2,18),
(27,16,'sale',-1,50,49,NULL,2,18),
(28,18,'sale',-1,12,11,NULL,2,19),
(29,4,'sale',-1,46,45,NULL,2,19),
(30,3,'sale',-1,50,49,NULL,2,19),
(31,3,'sale',-1,49,48,NULL,2,20),
(32,6,'sale',-2,298,296,NULL,2,21),
(33,50,'sale',-1,15,14,NULL,2,22),
(34,6,'sale',-2,296,294,NULL,2,23),
(35,9,'sale',-2,196,194,NULL,2,23),
(36,3,'sale',-2,48,46,NULL,2,23),
(37,29,'sale',-4,10,6,NULL,2,24),
(38,18,'sale',-1,11,10,NULL,2,24),
(39,6,'sale',-4,294,290,NULL,2,25),
(40,44,'sale',-1,5,4,NULL,2,25),
(41,3,'sale',-1,46,45,NULL,2,26),
(42,16,'sale',-1,49,48,NULL,2,27),
(43,12,'sale',-2,149,147,NULL,2,28),
(44,9,'sale',-2,194,192,NULL,2,28),
(45,6,'sale',-2,290,288,NULL,2,28),
(46,2,'sale',-2,48,46,NULL,2,29),
(47,10,'sale',-1,150,149,NULL,2,30),
(48,7,'sale',-1,300,299,NULL,2,30),
(49,6,'sale',-4,288,284,NULL,2,31),
(50,6,'sale',-3,284,281,NULL,2,32),
(51,76,'sale',-1,5,4,NULL,2,33),
(52,18,'sale',-1,10,9,NULL,2,34),
(53,19,'sale',-1,8,7,NULL,2,34),
(54,3,'sale',-1,45,44,NULL,2,35),
(55,24,'sale',-1,17,16,NULL,2,36),
(56,32,'sale',-2,3,1,NULL,2,37),
(57,60,'sale',-1,25,24,NULL,2,37),
(58,43,'sale',-1,2,1,NULL,2,37),
(59,6,'sale',-3,281,278,NULL,2,37),
(60,19,'adjustment',14,7,21,'',1,NULL),
(61,29,'sale',-2,6,4,NULL,2,38),
(62,6,'sale',-2,278,276,NULL,2,38),
(63,30,'sale',-1,6,5,NULL,2,39),
(64,69,'sale',-1,10,9,NULL,2,40),
(65,68,'sale',-1,10,9,NULL,2,40),
(66,37,'sale',-1,138,137,NULL,2,41),
(67,58,'sale',-1,5,4,NULL,2,42),
(68,69,'sale',-1,9,8,NULL,2,43),
(69,6,'sale',-3,276,273,NULL,2,44),
(70,18,'sale',-1,9,8,NULL,2,44),
(71,10,'sale',-1,149,148,NULL,2,44),
(72,16,'sale',-4,48,44,NULL,2,45),
(73,4,'sale',-2,45,43,NULL,2,46),
(74,3,'sale',-1,44,43,NULL,2,47),
(75,36,'sale',-1,5,4,NULL,2,48),
(76,23,'sale',-1,21,20,NULL,2,48),
(77,9,'sale',-1,192,191,NULL,2,49),
(78,71,'sale',-1,10,9,NULL,2,50),
(79,9,'sale',-4,191,187,NULL,2,50),
(80,12,'sale',-1,147,146,NULL,2,51),
(81,9,'sale',-1,187,186,NULL,2,51),
(82,6,'sale',-4,273,269,NULL,2,52),
(83,67,'sale',-1,47,46,NULL,2,52),
(84,18,'sale',-1,8,7,NULL,2,53),
(85,69,'sale',-1,8,7,NULL,2,54),
(86,4,'sale',-1,43,42,NULL,2,55),
(87,69,'sale',-3,7,4,NULL,2,56),
(88,2,'sale',-1,46,45,NULL,2,57),
(89,12,'sale',-2,146,144,NULL,2,58),
(90,9,'sale',-2,186,184,NULL,2,58),
(91,6,'sale',-2,269,267,NULL,2,58),
(92,33,'sale',-1,3,2,NULL,2,59),
(93,78,'sale',-1,15,14,NULL,2,60),
(94,54,'sale',-2,5,3,NULL,2,61),
(95,78,'sale',-1,14,13,NULL,2,62),
(96,4,'sale',-1,42,41,NULL,2,62),
(97,72,'sale',-3,40,37,NULL,2,63),
(98,72,'sale',-2,37,35,NULL,2,64),
(99,72,'sale',-1,35,34,NULL,2,65),
(100,72,'sale',-1,34,33,NULL,2,66),
(101,72,'sale',-3,33,30,NULL,2,67),
(102,78,'sale',-1,13,12,NULL,2,68),
(103,72,'sale',-3,30,27,NULL,2,69);

-- ============================================================
-- FIN DEL SCRIPT
-- ============================================================

-- Para probar la instalación:
-- 1. Conectarse a MySQL: mysql -u root -p
-- 2. Ejecutar: source /ruta/a/schema_new_with_data.sql
-- 3. Verificar: USE cafeteria_pos; SHOW TABLES;
-- 4. Login de prueba:
--    - Admin (Vanina):  vaolimpo@hotmail.com  / (contraseña existente)
--    - Cajero (Maga):   maga@gmail.com        / (contraseña existente)
--    - Admin (ALE):     Ale08cappella@gmail.com / (contraseña existente)

