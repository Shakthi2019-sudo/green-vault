import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, DemoUserItem } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  demoUsers: DemoUserItem[];
  switchUser: (username: string, password?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [demoUsers, setDemoUsers] = useState<DemoUserItem[]>([]);
  const [demoPasswords, setDemoPasswords] = useState<Record<string, string>>({});

  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = localStorage.getItem('gv_token');
        if (token) {
          const me = await api.getMe();
          setUser(me);
        }
      } catch (err) {
        localStorage.removeItem('gv_token');
        setUser(null);
      } finally {
        setLoading(false);
      }

      // Load demo users list
      try {
        const dUsers = await api.getDemoUsers();
        setDemoUsers(dUsers);
      } catch (err) {
        console.warn('Could not prefetch demo users', err);
      }
    };

    initAuth();
  }, []);

  const login = async (username: string, password: string) => {
    setLoading(true);
    try {
      const res = await api.login(username, password);
      localStorage.setItem('gv_token', res.access_token);
      setUser(res.user);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('gv_token');
    setUser(null);
  };

  const switchUser = async (username: string, password?: string) => {
    if (password) {
      await login(username, password);
    } else {
      // If password not provided in quick switcher, check if stored or request login
      throw new Error('Password required');
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, demoUsers, switchUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
