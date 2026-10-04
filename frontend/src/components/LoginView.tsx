import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, AlertCircle } from 'lucide-react';
import { Marca } from './Marca';

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

  // Campo escuro sobre a noite: igual nos dois temas, como a navbar
  const classeCampo =
    'w-full bg-black/30 border border-noite-borda rounded-lg pl-10 pr-3.5 py-2.5 text-[15px] text-noite-texto placeholder-noite-suave/70 focus:outline-none focus:ring-2 focus:ring-acao focus:border-transparent transition-colors';

  return (
    <div className="min-h-screen fundo-noite text-noite-texto flex flex-col justify-center items-center px-4 py-10">
      <div className="w-full max-w-[400px]">
        <div className="flex flex-col items-center text-center mb-9">
          <Marca tamanho="grande" />
          <p className="text-noite-suave text-[16px] mt-5">Controle do pátio da oficina</p>
        </div>

        <div className="bg-noite-alto/80 border border-noite-borda backdrop-blur-xl rounded-xl p-7 shadow-[0_30px_80px_-20px_rgb(0_0_0/0.7)]">
          <h1 className="font-placa text-[25px] leading-tight font-semibold">Entrar</h1>
          <p className="text-[14px] text-noite-suave mt-1">Use o e-mail e a senha do gestor.</p>

          {erro && (
            <div
              role="alert"
              className="mt-5 p-3 bg-alerta-noite/10 border border-alerta-noite/40 rounded-lg flex items-start gap-2.5 text-alerta-noite text-[14px]"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{erro}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-[14px] font-medium text-noite-texto mb-1.5">
                E-mail
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-noite-suave">
                  <Mail className="w-4 h-4" aria-hidden="true" />
                </div>
                <input
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  id="login-email"
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu.email@oficina.com.br"
                  className={classeCampo}
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-senha" className="block text-[14px] font-medium text-noite-texto mb-1.5">
                Senha
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-noite-suave">
                  <Lock className="w-4 h-4" aria-hidden="true" />
                </div>
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  value={senha}
                  id="login-senha"
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••"
                  className={classeCampo}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={carregando}
              className="w-full !mt-6 bg-acao hover:bg-[#3b74f0] text-white text-[16px] font-semibold py-3 px-4 rounded-lg border border-white/15 shadow-[0_0_28px_-6px_rgb(37_99_235/0.9)] flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {carregando ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <span>Entrar no R-Fleet</span>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-[13px] text-noite-suave mt-6">
          R-Fleet &copy; {new Date().getFullYear()}, mecânica e funilaria
        </p>
      </div>
    </div>
  );
};
