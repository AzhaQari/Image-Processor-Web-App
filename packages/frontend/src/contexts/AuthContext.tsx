import React, { createContext, useState, useEffect, useContext } from 'react';
import type { ReactNode } from 'react'; // Type-only import
import axios from 'axios';

interface User {
  id: string;
  email: string;
  name?: string;
  // Add other user properties as needed
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  login: () => void; // Placeholder, actual login is a redirect
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await axios.get<User>('/api/auth/me', { withCredentials: true });
        setUser(response.data);
      } catch (error) {
        setUser(null);
      }
      setIsLoading(false);
    };
    fetchUser();
  }, []);

  const login = () => {
    // Google OAuth login is a redirect, initiated by a button click
    // This function can be a placeholder or used for other login types in the future
    window.location.href = '/api/auth/google';
  };

  const logout = async () => {
    try {
      await axios.post('/api/auth/logout', {}, { withCredentials: true });
      setUser(null);
      // Optionally redirect to landing page or show a message
      window.location.href = '/'; // Redirect to landing page after logout
    } catch (error) {
      console.error('Logout failed:', error);
      // Handle logout error (e.g., show a notification)
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated: !!user, user, isLoading, login, logout }}>
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