import { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if user is already authenticated
    const currentUser = authService.getCurrentUser();
    const authenticated = authService.isAuthenticated();

    setUser(currentUser);
    setIsAuthenticated(authenticated);
    setLoading(false);
  }, []);

  const signUp = async (email, password) => {
    const data = await authService.signUp(email, password);
    // Don't set user immediately for signup, wait for email verification
    return data;
  };

  const signIn = async (email, password) => {
    const data = await authService.signIn(email, password);
    setUser(data.user);
    setIsAuthenticated(true);
    return data;
  };

  const signOut = async () => {
    await authService.signOut();
    setUser(null);
    setIsAuthenticated(false);
  };

  const value = {
    user,
    loading,
    signUp,
    signIn,
    signOut,
    isAuthenticated,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}