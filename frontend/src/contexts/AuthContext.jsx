import { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/api';
import { supabase } from '../supabaseClient';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          localStorage.setItem('access_token', session.access_token);
          if (session.refresh_token) {
            localStorage.setItem('refresh_token', session.refresh_token);
          }
          setUser({
            id: session.user.id,
            email: session.user.email
          });
          setIsAuthenticated(true);
        } else {
          const currentUser = authService.getCurrentUser();
          const authenticated = authService.isAuthenticated();
          setUser(currentUser);
          setIsAuthenticated(authenticated);
        }
      } catch (error) {
        const currentUser = authService.getCurrentUser();
        const authenticated = authService.isAuthenticated();
        setUser(currentUser);
        setIsAuthenticated(authenticated);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        localStorage.setItem('access_token', session.access_token);
        if (session.refresh_token) {
          localStorage.setItem('refresh_token', session.refresh_token);
        }
        setUser({
          id: session.user.id,
          email: session.user.email
        });
        setIsAuthenticated(true);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsAuthenticated(false);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email, password) => {
    const data = await authService.signUp(email, password);
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