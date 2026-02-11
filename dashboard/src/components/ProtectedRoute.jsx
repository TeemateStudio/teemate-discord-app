import { useState, useEffect, createContext, useContext } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { api } from '../api/client.js';

const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

export default function ProtectedRoute() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getMe()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="loading" style={{ height: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return (
    <AuthContext.Provider value={user}>
      <Outlet />
    </AuthContext.Provider>
  );
}
