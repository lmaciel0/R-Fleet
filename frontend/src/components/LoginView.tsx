import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, AlertCircle } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setCarregando(true);
    try {
      await login(email, senha);
    } catch (err: any) {
      setErro(err.message || 'Erro ao realizar login. Verifique suas credenciais.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen bg-parede flex flex-col justify-center items-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-placa text-[40px] leading-none font-bold text-grafite">R-Fleet</h1>
          <p className="text-aco text-[15px] mt-2">Controle do pátio da oficina</p>
        </div>

        {/* Card */}
        <div className="bg-etiqueta border border-trilho backdrop-blur-xl rounded-2xl p-7 shadow-2xl">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-grafite">Acesso ao Sistema</h2>
            <p className="text-xs text-aco mt-0.5">
              Entre com as credenciais do gestor responsável
            </p>
          </div>

          {erro && (
            <div role="alert" className="mb-5 p-3.5 bg-vermelho/10 border border-vermelho/40 rounded-xl flex items-start gap-2.5 text-vermelho text-sm">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-vermelho" />
              <span>{erro}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-xs font-semibold text-grafite mb-1.5 uppercase tracking-wider">
                E-mail
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-aco">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  id="login-email"
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu.email@oficina.com.br"
                  className="w-full bg-parede/60 border border-trilho rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-grafite placeholder-aco focus:outline-none focus:ring-2 focus:ring-mercosul focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-senha" className="block text-xs font-semibold text-grafite mb-1.5 uppercase tracking-wider">
                Senha
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-aco">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  value={senha}
                  id="login-senha"
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-parede/60 border border-trilho rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-grafite placeholder-aco focus:outline-none focus:ring-2 focus:ring-mercosul focus:border-transparent transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={carregando}
              className="w-full mt-2 bg-mercosul hover:bg-mercosul/90 text-white font-medium py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {carregando ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <span>Entrar</span>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-aco mt-6">
          R-Fleet &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
};
