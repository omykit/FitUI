import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { apiRequest, clearStoredToken, getStoredToken, storeToken } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    async function loadSession() {
      try {
        const storedToken = await getStoredToken();

        if (storedToken) {
          setToken(storedToken);
          const data = await apiRequest('/auth/me');
          setUser(data.user);
        }
      } catch {
        await clearStoredToken();
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    loadSession();
  }, []);

  const value = useMemo(
    () => ({
      isLoading,
      token,
      user,
      async login({ email, password }) {
        const data = await apiRequest('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });

        await storeToken(data.accessToken);
        setToken(data.accessToken);
        setUser(data.user);
      },
      async signup(payload) {
        const data = await apiRequest('/auth/signup', {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        await storeToken(data.accessToken);
        setToken(data.accessToken);
        setUser(data.user);
      },
      async logout() {
        await clearStoredToken();
        setToken(null);
        setUser(null);
      },
    }),
    [isLoading, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}
