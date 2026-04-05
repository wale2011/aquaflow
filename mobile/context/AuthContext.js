import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const [storedToken, storedUser] = await Promise.all([
        AsyncStorage.getItem('aquaflow_token'),
        AsyncStorage.getItem('aquaflow_user'),
      ]);
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        // Validate token is still good
        try {
          const res = await authAPI.me();
          setUser(res.data.user);
          await AsyncStorage.setItem('aquaflow_user', JSON.stringify(res.data.user));
        } catch {
          // Token expired
          await logout();
        }
      }
    } catch (err) {
      console.error('Auth load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const res = await authAPI.login({ email, password });
    const { token: newToken, user: newUser } = res.data;
    await AsyncStorage.setItem('aquaflow_token', newToken);
    await AsyncStorage.setItem('aquaflow_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    return newUser;
  };

  const register = async (data) => {
    const res = await authAPI.register(data);
    const { token: newToken, user: newUser } = res.data;
    await AsyncStorage.setItem('aquaflow_token', newToken);
    await AsyncStorage.setItem('aquaflow_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    return newUser;
  };

  const logout = async () => {
    await AsyncStorage.multiRemove(['aquaflow_token', 'aquaflow_user']);
    setToken(null);
    setUser(null);
  };

  const updateUser = async (updatedUser) => {
    const merged = { ...user, ...updatedUser };
    setUser(merged);
    await AsyncStorage.setItem('aquaflow_user', JSON.stringify(merged));
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
