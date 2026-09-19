import React, { createContext, useContext, useState, useEffect } from 'react';
import { storageService } from '../storage/storageService';

interface AuthContextType {
  user: any | null;
  token: string | null;
  salt: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [salt, setSalt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Restore session from localStorage
    const savedToken = localStorage.getItem('auth_token');
    const savedSalt = localStorage.getItem('auth_salt');
    if (savedToken && savedSalt) {
      setToken(savedToken);
      setSalt(savedSalt);
      setUser({ email: 'user@example.com' }); // Ideally fetch user info from backend
    }
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) throw new Error('Login failed');

      const data = await res.json();
      setToken(data.token);
      setSalt(data.salt);
      setUser({ email });
      
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('auth_salt', data.salt);

      // Initialize storage with encrypted mode
      storageService.setEncryptionKey(data.salt, password);
    } catch (error) {
      console.error(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_salt');
    setToken(null);
    setSalt(null);
    setUser(null);
    storageService.setEncryptionKey(null, null);
  };

  return (
    <AuthContext.Provider value={{ user, token, salt, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
