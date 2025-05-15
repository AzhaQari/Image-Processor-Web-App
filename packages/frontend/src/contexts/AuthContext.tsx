import React, { createContext, useState, useEffect, useContext } from 'react';
import type { ReactNode } from 'react';
// Keep SDK imports for logout and potentially for ApiError if needed for logout error handling
import { AuthenticationService, ApiError } from '@/sdk'; // ApiError is a class, SDKUser is a type
// Attempt to import User directly from its model file to bypass potential re-export issues
import type { User as SDKUser } from '../sdk/models/User'; 
import { trpc } from '../lib/trpc'; // Import tRPC client
import showToast from '@/lib/toastify';

// Local User type - should align with what trpc.user.getMe.useQuery() will return
// which is based on backend's userRouter.ts -> userService.ts User type.
interface User {
  id: string; // This is the Google ID
  email: string;
  name?: string | null; // tRPC might return null for optional fields
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean; // This will now reflect initial auth check status + logout
  login: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  // Keep track of whether the initial fetch attempt is done.
  const [isInitialAuthCheckComplete, setIsInitialAuthCheckComplete] = useState(false);

  // Use tRPC to fetch the current user profile
  const { 
    data: fetchedUser,
    isLoading: isLoadingUserQuery, // Renamed for clarity
    isError: isUserError,
    error: userError,
    isSuccess: isUserSuccess // Added for clarity
  } = trpc.user.getMe.useQuery(
    undefined, // No input for getMe
    {
      retry: (failureCount, error) => {
        // Don't retry on 401 (Unauthorized) or 404 (Not Found from our procedure)
        if (error.data?.httpStatus === 401 || error.data?.httpStatus === 404 || error.data?.code === 'UNAUTHORIZED' || error.data?.code === 'NOT_FOUND') {
          return false;
        }
        return failureCount < 2; // Default retry 2 times for other errors
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: true, // Refetch on window focus for freshness
      refetchOnMount: true, // Ensure query runs on mount to check auth status
    }
  );

  useEffect(() => {
    if (isLoadingUserQuery) {
      // If the query is actively loading, don't mark initial check as complete yet.
      return; 
    }

    // Once isLoadingUserQuery is false, this specific query attempt has finished.
    // We can now consider the initial authentication check as having been attempted.
    setIsInitialAuthCheckComplete(true);

    if (isUserSuccess && fetchedUser) {
      // Ensure fetchedUser conforms to our User interface.
      setUser({
        id: fetchedUser.id, // Assuming id is non-null from your tRPC user definition
        email: fetchedUser.email, // Assuming email is non-null
        name: fetchedUser.name, // name can be null
      });
    } else { 
      // Covers: isUserError, or isSuccess but fetchedUser is null/undefined (shouldn't happen if types align),
      // or query finished loading but wasn't a success (e.g. initial state before first fetch or after a 401)
      setUser(null);
      if (isUserError && userError && userError.data?.httpStatus !== 401 && userError.data?.code !== 'UNAUTHORIZED') {
        console.error('AuthContext - Failed to fetch user:', userError);
        showToast({ toastMsg: 'Error fetching user profile. Please try again later.', type: 'error' });
      }
    }
  }, [fetchedUser, isLoadingUserQuery, isUserError, userError, isUserSuccess]);

  const login = () => {
    // Redirect to backend Google OAuth endpoint
    window.location.href = 'http://localhost:3000/api/auth/google';
  };

  const logout = async () => {
    setIsLoggingOut(true);
    try {
      await AuthenticationService.postApiAuthLogout();
      setUser(null);
      // After logout, the auth check state might need to be reset if user could log back in
      // but setUser(null) and isInitialAuthCheckComplete remaining true should be fine.
      // ProtectedRoute will see isAuthenticated: false, isLoading: false (from contextIsLoading).
      showToast({ toastMsg: 'Successfully logged out.', type: 'success' });
    } catch (error) {
      console.error('Logout failed:', error);
      let message = 'Logout failed. Please try again.';
      if (error instanceof ApiError) {
        message = error.body?.message || message; 
      }
      showToast({ toastMsg: message, type: 'error' });
    } finally {
      setIsLoggingOut(false);
    }
  };
  
  // The context is loading if the initial auth check isn't complete OR if actively logging out.
  const contextIsLoading = !isInitialAuthCheckComplete || isLoggingOut;

  return (
    <AuthContext.Provider value={{ isAuthenticated: !!user, user, isLoading: contextIsLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 