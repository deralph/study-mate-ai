import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi, type ApiUser } from './api';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  department: string;
  year: string;
  university: string;
  avatar?: string;
  studyStreak: number;
  level: number;
  points: number;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: { name: string; email: string; password: string; department: string; year: string; university: string }) => Promise<void>;
  updateUser: (updated: AuthUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

function toAuthUser(u: ApiUser): AuthUser {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    department: u.department,
    year: u.year,
    university: u.university,
    avatar: u.avatar,
    studyStreak: u.study_streak,
    level: u.level,
    points: u.points,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const saved = localStorage.getItem('studymate_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('studymate_token');
    if (!token) { setLoading(false); return; }
    authApi.me()
      .then(({ user: u }) => setUser(toAuthUser(u)))
      .catch(() => {
        localStorage.removeItem('studymate_token');
        localStorage.removeItem('studymate_user');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (user) localStorage.setItem('studymate_user', JSON.stringify(user));
    else localStorage.removeItem('studymate_user');
  }, [user]);

  const login = async (email: string, password: string) => {
    const { token, user: u } = await authApi.login(email, password);
    localStorage.setItem('studymate_token', token);
    setUser(toAuthUser(u));
  };

  const signup = async (data: { name: string; email: string; password: string; department: string; year: string; university: string }) => {
    const { token, user: u } = await authApi.register(data);
    localStorage.setItem('studymate_token', token);
    setUser(toAuthUser(u));
  };

  const updateUser = (updated: AuthUser) => setUser(updated);

  const logout = () => {
    localStorage.removeItem('studymate_token');
    localStorage.removeItem('studymate_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, updateUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
