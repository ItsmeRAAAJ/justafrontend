import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  login as apiLogin,
  clearToken,
  getToken,
  setToken,
  getStoredUser,
  setStoredUser,
  UserRole,
} from '../services/api';

interface AuthUser {
  username: string;
  role: UserRole;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(getToken);
  const [user, setUser] = useState<AuthUser | null>(getStoredUser);

  // Sync state when storage changes (e.g. 401 forced logout from api client)
  useEffect(() => {
    const handler = () => {
      setTokenState(getToken());
      setUser(getStoredUser());
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const res = await apiLogin(username, password);
    setToken(res.access_token);
    const userData: AuthUser = { username, role: res.role };
    setStoredUser(userData);
    setTokenState(res.access_token);
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setTokenState(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
