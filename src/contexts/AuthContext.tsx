import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '../types';
import { db } from '../store';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<string | null>;
  register: (data: { name: string; email: string; password: string; role: string }) => Promise<string | null>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize Auth & Synchronize Database
  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      try {
        if (isSupabaseConfigured()) {
          // 1. Recover active Supabase Session immediately
          const { data: { session }, error } = await supabase.auth.getSession();

          if (error) {
            console.warn('[AuthProvider] Erro ao recuperar sessão do Supabase:', error.message);
          }

          if (session?.user && isMounted) {
            const initialUser: User = {
              id: session.user.id,
              name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Usuário',
              email: session.user.email || '',
              role: (session.user.user_metadata?.role as UserRole) || 'employee',
              passwordHash: '',
              createdAt: session.user.created_at || new Date().toISOString(),
            };

            setUser(initialUser);
            localStorage.setItem('mf_current_user', initialUser.id);

            const fetchUserProfile = async (userId: string) => {
              try {
                const { data: profile } = await supabase
                  .from('profiles')
                  .select('*')
                  .eq('id', userId)
                  .single();
                if (profile && isMounted) {
                  setUser(prev => prev ? {
                    ...prev,
                    name: profile.name || prev.name,
                    role: (profile.role as UserRole) || prev.role,
                  } : null);
                }
              } catch (e) {
                // Ignore profile enrichment errors
              }
            };

            fetchUserProfile(session.user.id);
          } else if (isMounted) {
            setUser(null);
            localStorage.removeItem('mf_current_user');
          }

          // 2. Set up onAuthStateChange listener for future auth state transitions
          const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!isMounted) return;

            if (session?.user) {
              const updatedUser: User = {
                id: session.user.id,
                name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Usuário',
                email: session.user.email || '',
                role: (session.user.user_metadata?.role as UserRole) || 'employee',
                passwordHash: '',
                createdAt: session.user.created_at || new Date().toISOString(),
              };

              setUser(updatedUser);
              localStorage.setItem('mf_current_user', session.user.id);

              // Enrich with profile asynchronously
              try {
                const { data: profile } = await supabase
                  .from('profiles')
                  .select('*')
                  .eq('id', session.user.id)
                  .single();
                if (profile && isMounted) {
                  setUser(prev => prev ? {
                    ...prev,
                    name: profile.name || prev.name,
                    role: (profile.role as UserRole) || prev.role,
                  } : null);
                }
              } catch (e) {
                // Ignore profile enrichment errors
              }
            } else if (event === 'SIGNED_OUT') {
              setUser(null);
              localStorage.removeItem('mf_current_user');
            }
          });

          // 3. Trigger database cache sync in background (does not block auth state)
          db.init().catch(err => console.warn('[DB] Init error:', err));

          return () => {
            subscription.unsubscribe();
          };
        } else {
          // Fallback: Local Cache Session
          const savedUserId = localStorage.getItem('mf_current_user');
          if (savedUserId && isMounted) {
            const u = db.getUserById(savedUserId);
            if (u) setUser(u);
          }
          await db.init();
        }
      } catch (err) {
        console.warn('[AuthProvider] Erro ao inicializar autenticação:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (email: string, password: string): Promise<string | null> => {
    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            return 'E-mail ou senha incorretos.';
          }
          return error.message;
        }

        if (data.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          const currentUser: User = {
            id: data.user.id,
            name: profile?.name || data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'Usuário',
            email: data.user.email || email,
            role: (profile?.role || data.user.user_metadata?.role || 'employee') as UserRole,
            passwordHash: '',
            createdAt: profile?.created_at || data.user.created_at || new Date().toISOString(),
          };

          setUser(currentUser);
          localStorage.setItem('mf_current_user', currentUser.id);
          db.init().catch(() => {});
          return null;
        }
      }

      // Local / Fallback login
      const u = db.getUserByEmail(email.trim());
      if (!u) {
        // If demo user is requested and not in store yet
        if (email.trim() === 'admin@demo.com') {
          db.loadDemoData();
          const demoAdmin = db.getUserByEmail('admin@demo.com');
          if (demoAdmin) {
            setUser(demoAdmin);
            localStorage.setItem('mf_current_user', demoAdmin.id);
            return null;
          }
        }
        return 'Usuário não encontrado';
      }

      setUser(u);
      localStorage.setItem('mf_current_user', u.id);
      return null;
    } catch (err: any) {
      return err?.message || 'Erro inesperado ao realizar login';
    }
  };

  const register = async (data: { name: string; email: string; password: string; role: string }): Promise<string | null> => {
    try {
      if (isSupabaseConfigured()) {
        const { data: authData, error } = await supabase.auth.signUp({
          email: data.email.trim(),
          password: data.password,
          options: {
            data: {
              name: data.name.trim(),
              role: data.role,
            },
          },
        });

        if (error) {
          if (error.message.includes('User already registered')) {
            return 'Este e-mail já está cadastrado.';
          }
          return error.message;
        }

        if (authData.user) {
          // Upsert Profile
          await supabase.from('profiles').upsert({
            id: authData.user.id,
            name: data.name.trim(),
            email: data.email.trim(),
            role: data.role,
          });

          const newUser: User = {
            id: authData.user.id,
            name: data.name.trim(),
            email: data.email.trim(),
            role: data.role as UserRole,
            passwordHash: '',
            createdAt: new Date().toISOString(),
          };

          setUser(newUser);
          localStorage.setItem('mf_current_user', newUser.id);
          db.addHistory({
            userId: newUser.id,
            action: 'Usuário registrado',
            entity: 'user',
            entityId: newUser.id,
            details: `Novo usuário: ${data.name} (${data.role})`,
          });
          return null;
        }
      }

      // Local / Fallback register
      const existing = db.getUserByEmail(data.email.trim());
      if (existing) return 'E-mail já cadastrado';

      const newUser = db.createUser({
        name: data.name.trim(),
        email: data.email.trim(),
        passwordHash: '',
        role: data.role as UserRole,
      });

      db.addHistory({
        userId: newUser.id,
        action: 'Usuário registrado',
        entity: 'user',
        entityId: newUser.id,
        details: `Novo usuário: ${data.name} (${data.role})`,
      });

      setUser(newUser);
      localStorage.setItem('mf_current_user', newUser.id);
      return null;
    } catch (err: any) {
      return err?.message || 'Erro inesperado ao registrar conta';
    }
  };

  const logout = async () => {
    try {
      if (isSupabaseConfigured()) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.warn('[AuthContext] Erro ao deslogar do Supabase:', err);
    } finally {
      setUser(null);
      localStorage.removeItem('mf_current_user');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        register,
        logout,
        isAuthenticated: !!user,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
