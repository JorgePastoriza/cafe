// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';

// Components
import Layout from './components/Layout';

// Pages
import Login from './pages/Login';
import POS from './pages/POS';
import Dashboard from './pages/Dashboard';
import Productos from './pages/Productos';
import Categorias from './pages/Categorias';
import Stock from './pages/Stock';
import Ventas from './pages/Ventas';
import Usuarios from './pages/Usuarios';
import Cierre from './pages/Cierre';
import Configuracion from './pages/Configuracion';

// ============================================================
// PROTECTED ROUTE GUARD
// ============================================================
function ProtectedRoute({ adminOnly = false }) {
  const { user, isAdmin } = useAuth();
  
  // Si no está autenticado → Login
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // Si requiere admin y no es admin → Redirect a POS
  if (adminOnly && !isAdmin()) {
    return <Navigate to="/pos" replace />;
  }
  
  return <Outlet />;
}

// ============================================================
// LAYOUT WRAPPER (con sidebar)
// ============================================================
function LayoutWrapper() {
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}

// ============================================================
// APP PRINCIPAL
// ============================================================
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <Toaster 
            position="top-right" 
            toastOptions={{ 
              duration: 3000,
              style: {
                background: '#1a0a00',
                color: '#f5e6d3',
                borderRadius: '12px',
                padding: '12px 16px',
                fontSize: '14px',
                fontWeight: '500'
              }
            }} 
          />
          
          <Routes>
            {/* Redirect raíz → Login */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            
            {/* Login (público) */}
            <Route path="/login" element={<Login />} />
            
            {/* Rutas protegidas CON Layout */}
            <Route element={<ProtectedRoute />}>
              <Route element={<LayoutWrapper />}>
                {/* POS - Todos los usuarios */}
                <Route path="/pos" element={<POS />} />
                
                {/* Cierre - Todos los usuarios */}
                <Route path="/cierre" element={<Cierre />} />
                
                {/* Stock - Todos los usuarios */}
                <Route path="/stock" element={<Stock />} />
                
                {/* Rutas SOLO para Admin */}
                <Route element={<ProtectedRoute adminOnly />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/productos" element={<Productos />} />
                  <Route path="/categorias" element={<Categorias />} />
                  <Route path="/ventas" element={<Ventas />} />
                  <Route path="/usuarios" element={<Usuarios />} />
                  <Route path="/configuracion" element={<Configuracion />} />
                </Route>
              </Route>
            </Route>
            
            {/* 404 - Ruta no encontrada */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
