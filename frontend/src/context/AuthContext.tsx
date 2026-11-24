import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, UserRole } from '../types';
import { api } from '../services/api';
import { offlineStorage } from '../services/offlineStorage';

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  token: string | null;
  isLoading: boolean;
  isOfflineMode: boolean;
  login: (credentials: { email: string; password: string }) => Promise<any>;
  register: (data: any) => Promise<any>;
  adminRegister: (data: any) => Promise<any>;
  verifyOtp: (data: { email: string; otp_code: string; purpose?: string }) => Promise<any>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('agrishield_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('agrishield_token'));
  const [role, setRole] = useState<UserRole | null>(() => {
    const savedRole = localStorage.getItem('agrishield_role');
    return savedRole === 'ADMIN' || savedRole === 'FARMER' ? (savedRole as UserRole) : null;
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isOfflineMode, setIsOfflineMode] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOfflineMode(false);
    const handleOffline = () => setIsOfflineMode(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const refreshUser = async () => {
    if (!token) {
      setUser(null);
      setRole(null);
      setIsLoading(false);
      return;
    }
    try {
      const userData = await api.getCurrentUser();
      setUser(userData);
      setRole(userData.role);
      localStorage.setItem('agrishield_role', userData.role);
      localStorage.setItem('agrishield_user', JSON.stringify(userData));
    } catch (err) {
      // If offline, check if we have cached user state
      const savedUser = localStorage.getItem('agrishield_user');
      if (savedUser && (!navigator.onLine || token.startsWith('offline_'))) {
        console.log('[AgriShield Auth] Maintaining offline session from cache.');
        setUser(JSON.parse(savedUser));
        return;
      }
      console.error('Failed to restore user session:', err);
      localStorage.removeItem('agrishield_token');
      localStorage.removeItem('agrishield_refresh_token');
      localStorage.removeItem('agrishield_role');
      localStorage.removeItem('agrishield_user');
      setToken(null);
      setUser(null);
      setRole(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, [token]);

  const login = async (credentials: { email: string; password: string }) => {
    setIsLoading(true);
    try {
      const res = await api.login(credentials);
      localStorage.setItem('agrishield_token', res.access_token);
      localStorage.setItem('agrishield_refresh_token', res.refresh_token);
      localStorage.setItem('agrishield_role', res.role);
      setToken(res.access_token);
      setRole(res.role as UserRole);

      let currentUser: any;
      try {
        currentUser = await api.getCurrentUser();
      } catch {
        currentUser = {
          id: res.user_id,
          email: credentials.email,
          role: res.role,
          is_active: true,
          is_verified: true,
          farmer_profile: res.full_name ? { full_name: res.full_name } : undefined,
          created_at: new Date().toISOString()
        };
      }
      setUser(currentUser);
      localStorage.setItem('agrishield_user', JSON.stringify(currentUser));

      // Cache session in IndexedDB for offline authentication
      await offlineStorage.cacheLoginSession(
        credentials.email,
        credentials.password,
        currentUser,
        res.access_token,
        res.role
      );
    } catch (onlineError: any) {
      console.warn('[AgriShield Auth] Online login failed, testing cached offline credentials:', onlineError.message);
      const offlineResult = await offlineStorage.verifyOfflineLogin(credentials.email, credentials.password);
      if (offlineResult) {
        localStorage.setItem('agrishield_token', offlineResult.token);
        localStorage.setItem('agrishield_role', offlineResult.role);
        localStorage.setItem('agrishield_user', JSON.stringify(offlineResult.user));
        setToken(offlineResult.token);
        setRole(offlineResult.role as UserRole);
        setUser(offlineResult.user);
        setIsOfflineMode(true);
        console.log('[AgriShield Auth] Authenticated via offline cache.');
        return;
      }
      throw onlineError;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: any) => {
    return await api.register(data);
  };

  const adminRegister = async (data: any) => {
    return await api.adminRegister(data);
  };

  const verifyOtp = async (data: { email: string; otp_code: string; purpose?: string }) => {
    setIsLoading(true);
    try {
      const res = await api.verifyOtp(data);
      localStorage.setItem('agrishield_token', res.access_token);
      localStorage.setItem('agrishield_refresh_token', res.refresh_token);
      localStorage.setItem('agrishield_role', res.role);
      setToken(res.access_token);
      setRole(res.role as UserRole);
      const currentUser = await api.getCurrentUser();
      setUser(currentUser);
      localStorage.setItem('agrishield_user', JSON.stringify(currentUser));
      return res;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await api.logout();
    } finally {
      setToken(null);
      setUser(null);
      setRole(null);
      localStorage.removeItem('agrishield_user');
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        token,
        isLoading,
        isOfflineMode,
        login,
        register,
        adminRegister,
        verifyOtp,
        logout,
        refreshUser,
        isAuthenticated: !!token && !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
