import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as api from './api';
import { getDB } from './database';

interface User {
  id: number; email: string; role: string; full_name: string; phone: string | null;
  father_name: string | null; class_id: number | null; section_id: number | null;
  roll_number: string | null; username: string | null; is_active: number; is_verified: number;
}

type Theme = 'light' | 'dark';

interface AppContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  theme: Theme;
  toggleTheme: () => void;
  login: (email: string, otp: string) => Promise<{ success: boolean; message: string }>;
  staffLogin: (username: string, password: string, otp: string) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  requestOTP: (email: string) => Promise<{ success: boolean; message: string; otp?: string }>;
  registerStudent: (data: any) => Promise<{ success: boolean; message: string }>;
  setupPrincipal: (data: any) => Promise<{ success: boolean; message: string }>;
  dbReady: boolean;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [dbReady, setDbReady] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('st_theme') as Theme) || 'light';
  });

  useEffect(() => {
    (async () => {
      await getDB();
      setDbReady(true);
      const token = localStorage.getItem('st_token');
      if (token) {
        const u = await api.validateSession(token);
        if (u && u.is_active) {
          setUser(u as any);
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem('st_token');
        }
      }
      setIsLoading(false);
    })();
  }, []);

  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
    localStorage.setItem('st_theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light');

  const requestOTP = async (email: string) => {
    const rateCheck = await api.checkOTPRateLimit(email);
    if (!rateCheck.allowed) return { success: false, message: `Please wait ${rateCheck.waitSeconds}s before requesting a new OTP.` };
    const otp = await api.createOTP(email);
    return { success: true, message: 'OTP sent to your email.', otp };
  };

  const registerStudent = async (data: any) => {
    const existing = await api.getUserByEmail(data.email);
    if (existing) return { success: false, message: 'This email is already registered.' };
    const id = await api.createUser({ ...data, role: 'student' });
    await api.addAuditLog(id, data.full_name, 'student', 'Registration', `Student registered: ${data.email}`);
    return { success: true, message: 'Registration successful.' };
  };

  const login = async (email: string, otp: string) => {
    const otpResult = await api.verifyOTPRecord(email, otp);
    if (!otpResult.success) return otpResult;
    const u = await api.getUserByEmail(email);
    if (!u) return { success: false, message: 'No account found.' };
    if (!u.is_active) return { success: false, message: 'Account disabled.' };
    if (u.role !== 'student') return { success: false, message: 'Use staff login.' };
    await api.updateUser(u.id, { is_verified: 1 } as any);
    const token = await api.createSession(u.id);
    localStorage.setItem('st_token', token);
    setUser(u as any);
    setIsAuthenticated(true);
    await api.addAuditLog(u.id, u.full_name, 'student', 'Login', 'Student logged in');
    return { success: true, message: 'Login successful.' };
  };

  const staffLogin = async (username: string, password: string, otp: string) => {
    const u = await api.getUserByUsername(username);
    if (!u) return { success: false, message: 'Invalid credentials.' };
    if (!u.is_active) return { success: false, message: 'Account disabled.' };
    if (!u.password_hash || !api.verifyPassword(password, u.password_hash))
      return { success: false, message: 'Invalid credentials.' };
    const otpResult = await api.verifyOTPRecord(u.email, otp);
    if (!otpResult.success) return otpResult;
    const token = await api.createSession(u.id);
    localStorage.setItem('st_token', token);
    setUser(u as any);
    setIsAuthenticated(true);
    await api.addAuditLog(u.id, u.full_name, u.role, 'Login', `${u.role} logged in`);
    return { success: true, message: 'Login successful.' };
  };

  const logout = async () => {
    const token = localStorage.getItem('st_token');
    if (token) {
      if (user) await api.addAuditLog(user.id, user.full_name, user.role, 'Logout', 'User logged out');
      await api.deleteSession(token);
    }
    localStorage.removeItem('st_token');
    setUser(null);
    setIsAuthenticated(false);
  };

  const setupPrincipal = async (data: any) => {
    const existing = await api.getUserByEmail(data.email);
    if (existing) return { success: false, message: 'Email already exists.' };
    const principals = await api.getUsersByRole('principal');
    if (principals.length > 0) return { success: false, message: 'Principal already exists.' };
    const id = await api.createUser({
      email: data.email, password: data.password, role: 'principal',
      full_name: data.full_name, username: data.username
    });
    await api.updateUser(id, { is_verified: 1 } as any);
    await api.addAuditLog(id, data.full_name, 'principal', 'Setup', 'Principal account created');
    return { success: true, message: 'Principal account created.' };
  };

  return (
    <AppContext.Provider value={{
      user, isAuthenticated, isLoading, theme, toggleTheme,
      login, staffLogin, logout, requestOTP, registerStudent, setupPrincipal, dbReady
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
