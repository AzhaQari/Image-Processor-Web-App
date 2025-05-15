import React, { createContext, useState, useEffect, useContext } from 'react';
import type { ReactNode } from 'react'; // Type-only import
// import axios from 'axios'; No longer needed
import { AuthenticationService, ApiError } from '@/sdk'; // Import SDK services and error type
import type { User as SDKUser } from '@/sdk'; // Import SDK User type

// Align local User type with SDKUser concerning optionality of id/email if SDK makes them so,
// or handle the case where they might be undefined more gracefully.
interface User {
  id: string; // Assuming id from SDKUser will be present on successful fetch
  email: string; // Assuming email from SDKUser will be present on successful fetch
  name?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  login: () => void; // OAuth redirect, no direct API call via SDK here
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      setIsLoading(true);
      try {
        const sdkUser: SDKUser = await AuthenticationService.getApiAuthMe();
        
        // Ensure essential fields are present before setting the user
        if (sdkUser.id && sdkUser.email) {
          setUser({
            id: sdkUser.id,          // Now correctly typed as string
            email: sdkUser.email,      // Now correctly typed as string
            name: sdkUser.name || undefined,
          });
        } else {
          // This case should ideally not happen if API guarantees id/email for authenticated user
          console.error('Fetched user profile is missing id or email.');
          setUser(null);
        }
      } catch (error) {
        setUser(null);
        if (error instanceof ApiError) {
          // ApiError status 401 typically means not authenticated, which is handled by setUser(null)
          if (error.status !== 401) { 
            console.error('Failed to fetch user:', error.body);
          }
        } else {
          console.error('An unexpected error occurred while fetching user:', error);
        }
      }
      setIsLoading(false);
    };
    fetchUser();
  }, []);

  const login = () => {
    // Google OAuth login is a redirect, initiated by a button click
    // This function directly navigates, no SDK call for this part.
    window.location.href = '/api/auth/google';
  };

  const logout = async () => {
    try {
      // Use AuthenticationService from the SDK
      await AuthenticationService.postApiAuthLogout();
      setUser(null);
      window.location.href = '/'; // Redirect to landing page after logout
    } catch (error) {
      if (error instanceof ApiError) {
        console.error('Logout failed:', error.body);
        // Handle logout error (e.g., show a notification)
      } else {
        console.error('An unexpected error occurred during logout:', error);
      }
      // Even if logout API call fails, try to clear client-side state and redirect
      // Depending on desired UX, you might not always clear user/redirect if API fails
      setUser(null);
      if (window.location.pathname !== '/') { // Avoid loop if already on landing
        window.location.href = '/';
      }
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