import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { db, verifyPassword, hashPassword, generateId } from '../store';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => string | null;
  register: (data: { name: string; email: string; password: string; role: string }) => string | null;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const savedUserId = localStorage.getItem('mf_current_user');
    if (savedUserId) {
      const u = db.getUserById(savedUserId);
      if (u) setUser(u);
    }
  }, []);

  const login = (email: string, password: string): string | null => {
    const u = db.getUserByEmail(email);
    if (!u) return 'Usuário não encontrado';
    if (!verifyPassword(password, u.passwordHash)) return 'Senha incorreta';
    setUser(u);
    localStorage.setItem('mf_current_user', u.id);
    return null;
  };

  const register = (data: { name: string; email: string; password: string; role: string }): string | null => {
    const existing = db.getUserByEmail(data.email);
    if (existing) return 'E-mail já cadastrado';
    const newUser = db.createUser({
      name: data.name,
      email: data.email,
      passwordHash: hashPassword(data.password),
      role: data.role as User['role'],
    });
    db.addHistory({ userId: newUser.id, action: 'Usuário registrado', entity: 'user', entityId: newUser.id, details: `Novo usuário: ${data.name}` });
    setUser(newUser);
    localStorage.setItem('mf_current_user', newUser.id);
    return null;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('mf_current_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
