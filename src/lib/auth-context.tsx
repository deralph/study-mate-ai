import React, { createContext, useContext, useState, useEffect } from 'react';

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
}

interface AuthContextType {
  user: AuthUser | null;
  login: (email: string, password: string) => void;
  signup: (data: Omit<AuthUser, 'id' | 'studyStreak' | 'level'>) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const saved = localStorage.getItem('studymate_user');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    if (user) localStorage.setItem('studymate_user', JSON.stringify(user));
    else localStorage.removeItem('studymate_user');
  }, [user]);

  const login = (_email: string, _password: string) => {
    // Mock login — in real app, call API
    const saved = localStorage.getItem('studymate_user');
    if (saved) {
      setUser(JSON.parse(saved));
    } else {
      // Demo fallback
      setUser({
        id: '1',
        name: 'Omolara Adeyemi',
        email: _email,
        department: 'Computer Science',
        year: '300 Level',
        university: 'Adekunle Ajasin University (AAUA)',
        studyStreak: 12,
        level: 7,
      });
    }
  };

  const signup = (data: Omit<AuthUser, 'id' | 'studyStreak' | 'level'>) => {
    const newUser: AuthUser = {
      ...data,
      id: Date.now().toString(),
      studyStreak: 0,
      level: 1,
    };
    setUser(newUser);
  };

  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
