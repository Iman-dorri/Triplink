'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI, storage } from '@/lib/api';

interface User {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  is_verified: boolean;
  status: string;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: {
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    password: string;
    phone?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is already logged in
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = storage.getToken();
        const userData = storage.getUserData();
        
        if (token && userData) {
          // Verify token is still valid by fetching profile
          try {
            const profile = await authAPI.getProfile();
            setUser(profile);
            storage.saveUserData(profile);
          } catch (error) {
            // Token invalid, clear storage
            storage.clearAll();
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (usernameOrEmail: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await authAPI.login(usernameOrEmail, password);
      
      let token, user;
      
      if (response.access_token && response.user) {
        token = response.access_token;
        user = response.user;
      } else {
        throw new Error('Invalid response format from server during login');
      }
      
      storage.saveToken(token);
      storage.saveUserData(user);
      setUser(user);
    } catch (error: any) {
      console.error('Login error in AuthContext:', error);
      throw new Error(error.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: {
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    password: string;
    phone?: string;
  }) => {
    try {
      setIsLoading(true);
      const response = await authAPI.register(userData);
      
      let token, user;
      
      if (response.access_token && response.user) {
        token = response.access_token;
        user = response.user;
      } else {
        throw new Error('Invalid response format from server during registration');
      }
      
      storage.saveToken(token);
      storage.saveUserData(user);
      setUser(user);
    } catch (error: any) {
      console.error('Registration error in AuthContext:', error);
      throw new Error(error.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
      setUser(null);
    } catch (error: any) {
      console.error('Logout error:', error);
      // Clear local storage anyway
      storage.clearAll();
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};




