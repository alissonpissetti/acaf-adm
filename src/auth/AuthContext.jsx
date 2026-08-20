import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  clearToken,
  getMe,
  getToken,
  login as apiLogin,
  loginWithOtp as apiLoginWithOtp,
  refreshMe,
  resetPasswordWithOtp as apiResetPasswordWithOtp,
  requestOtp as apiRequestOtp,
  setToken,
} from '../api/auth.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  const applyProfile = (profile) => {
    setUser(profile);
    setPermissions(Array.isArray(profile?.permissions) ? profile.permissions : []);
  };

  const applyAuthResult = (result) => {
    setToken(result.accessToken);
    applyProfile(result.user);
    return result.user;
  };

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    getMe(token)
      .then((profile) => {
        applyProfile(profile);
      })
      .catch(() => {
        clearToken();
        setUser(null);
        setPermissions([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => applyAuthResult(await apiLogin(email, password));

  const loginWithOtp = async (mobilePhone, code) =>
    applyAuthResult(await apiLoginWithOtp(mobilePhone, code));

  const requestOtp = (mobilePhone, purpose) => apiRequestOtp(mobilePhone, purpose);

  const resetPasswordWithOtp = (mobilePhone, code, newPassword) =>
    apiResetPasswordWithOtp(mobilePhone, code, newPassword);

  const logout = () => {
    clearToken();
    setUser(null);
    setPermissions([]);
  };

  const refreshProfile = async () => {
    const profile = await refreshMe();
    applyProfile(profile);
    return profile;
  };

  const hasPermission = (key) => permissions.includes(key);

  const value = useMemo(
    () => ({
      user,
      permissions,
      loading,
      isAuthenticated: Boolean(user),
      hasPermission,
      login,
  loginWithOtp,
  refreshMe,
  requestOtp,
      resetPasswordWithOtp,
      logout,
      refreshProfile,
    }),
    [user, permissions, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider.');
  }
  return context;
}
