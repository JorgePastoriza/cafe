// src/context/AuthContext.jsx
import { createContext, useContext, useState } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { 
      return JSON.parse(localStorage.getItem('user')); 
    } catch { 
      return null; 
    }
  });
  
  const [loading, setLoading] = useState(false);

  /**
   * Login - Autenticar usuario
   * @param {string} email 
   * @param {string} password 
   * @returns {Promise<Object>} Usuario autenticado
   */
  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await authAPI.login({ email, password });
      const { token, user: userData } = res.data;
      
      // Guardar en localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      
      // Actualizar estado
      setUser(userData);
      
      return userData;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Logout - Cerrar sesión
   */
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  /**
   * Verificar si el usuario es admin
   * @returns {boolean}
   */
  const isAdmin = () => {
    return user?.role === 'admin';
  };

  /**
   * Verificar si el usuario es cajero
   * @returns {boolean}
   */
  const isCajero = () => {
    return user?.role === 'cajero';
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      login, 
      logout, 
      isAdmin,
      isCajero
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
};
