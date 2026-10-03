import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Wrench, ArrowLeft } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setError('Informe seu e-mail.');
      return;
    }

    // Basic email format validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Informe um e-mail válido.');
      return;
    }

    if (!isSupabaseConfigured()) {
      setError('Serviço de autenticação não configurado.');
      return;
    }

    setLoading(true);

    try {
      // Use window.location.origin so it works on localhost AND production (Vercel)
      const redirectTo = `${window.location.origin}/reset-password`;

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo,
      });

      if (resetError) {
        setError('Não foi possível enviar o e-mail de recuperação. Tente novamente.');
        return;
      }

      // Always show success — never reveal whether the email exists
      setSent(true);
    } catch {
      setError('Erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
            <Wrench size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Manutenção Flexível</h1>
          <p className="text-blue-200 text-sm mt-1">Plataforma de Gestão Industrial</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Recuperar Senha</h2>

          {sent ? (
            <>
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                Se o e-mail informado estiver cadastrado, você receberá um link para redefinir sua senha. Verifique também a caixa de spam.
              </div>
              <Link
                to="/login"
                className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft size={16} />
                Voltar ao Login
              </Link>
            </>
          ) : (
            <>
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              <p className="text-sm text-gray-600 mb-4">
                Informe o e-mail vinculado à sua conta para receber um link de recuperação de senha.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="seu@email.com"
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-60"
                >
                  {loading ? 'Enviando...' : 'Enviar Link de Recuperação'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link to="/login" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                  Voltar ao Login
                </Link>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-blue-200 text-xs mt-6">
          © 2026 Manutenção Flexível — Projeto TCC
        </p>
      </div>
    </div>
  );
}
