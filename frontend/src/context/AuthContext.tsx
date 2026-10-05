import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../services/api';
import { Usuario } from '../types';

interface AuthContextType {
  usuario: Usuario | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, senha: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [usuario, setUsuario] = useState<Usuario | null>(() => {
    const saved = sessionStorage.getItem('rfleet_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => {
    return sessionStorage.getItem('rfleet_token');
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // A sessão vive só na aba (sessionStorage); apaga a que versões antigas deixaram no localStorage
    localStorage.removeItem('rfleet_token');
    localStorage.removeItem('rfleet_user');

    const checkAuth = async () => {
      const storedToken = sessionStorage.getItem('rfleet_token');
      if (storedToken) {
        try {
          const me = await api.getMe();
          setUsuario(me);
          sessionStorage.setItem('rfleet_user', JSON.stringify(me));
        } catch {
          logout();
        }
      }
      setIsLoading(false);
    };

    checkAuth();

    const handleUnauthorized = () => {
      logout();
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const login = async (email: string, senha: string) => {
    const response = await api.login(email, senha);
    setToken(response.token);
    setUsuario(response.usuario);
    sessionStorage.setItem('rfleet_token', response.token);
    sessionStorage.setItem('rfleet_user', JSON.stringify(response.usuario));
  };

  const logout = () => {
    setToken(null);
    setUsuario(null);
    sessionStorage.removeItem('rfleet_token');
    sessionStorage.removeItem('rfleet_user');
  };

  return (
    <AuthContext.Provider
      value={{
        usuario,
        token,
        isAuthenticated: !!token && !!usuario,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
};
