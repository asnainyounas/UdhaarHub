import React, { createContext, useContext, useState, useEffect } from 'react';
import { getMeApi, logoutApi } from '../api/auth.api';

const AuthContext = createContext(null);

const normalizeCompany = (c) => {
  if (!c || typeof c !== 'object') return null;
  const companyId = c.id || c._id;
  const normalizedId = companyId ? companyId.toString() : undefined;
  return {
    ...c,
    id: normalizedId,
    _id: normalizedId,
  };
};

const normalizeUser = (u) => {
  if (!u || typeof u !== 'object') return null;
  const userId = u.id || u._id;
  const normalizedId = userId ? userId.toString() : undefined;
  return {
    ...u,
    id: normalizedId,
    _id: normalizedId,
  };
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      try {
        const data = await getMeApi();
        if (isMounted && data.success && data.user) {
          setUser(normalizeUser(data.user));
          setCompany(normalizeCompany(data.company));
          setIsAuthenticated(true);
        } else if (isMounted) {
          setUser(null);
          setCompany(null);
          setIsAuthenticated(false);
        }
      } catch {
        if (isMounted) {
          setUser(null);
          setCompany(null);
          setIsAuthenticated(false);
        }
      } finally {
        if (isMounted) {
          setAuthChecked(true);
        }
      }
    };

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = ({ user: newUser, company: newCompany } = {}) => {
    if (newUser !== undefined) {
      setUser(newUser ? normalizeUser(newUser) : null);
    }
    if (newCompany !== undefined) {
      setCompany(newCompany ? normalizeCompany(newCompany) : null);
    }
    setIsAuthenticated(true);
    setAuthChecked(true);
  };

  const logout = async () => {
    try {
      await logoutApi();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      setCompany(null);
      setIsAuthenticated(false);
      setAuthChecked(true);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        company,
        isAuthenticated,
        authChecked,
        loading,
        setLoading,
        login,
        logout,
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

export default AuthContext;

