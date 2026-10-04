import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Car,
  LayoutGrid,
  ListFilter,
  BarChart3,
  Plus,
  FileSpreadsheet,
  LogOut,
  AlertTriangle,
  History,
  LucideIcon,
} from 'lucide-react';
import { AbaApp, DashboardMetricas } from '../types';

interface NavbarProps {
  abaAtiva: AbaApp;
  setAbaAtiva: (aba: AbaApp) => void;
  onAbrirNovaEntrada: () => void;
  onAbrirImportar: () => void;
  metricas?: DashboardMetricas | null;
}

// Rótulos curtos para caber numa linha; o nome completo fica no tooltip
const ABAS: { aba: AbaApp; icone: LucideIcon; rotulo: string; rotuloMobile: string; titulo: string }[] = [
  { aba: 'kanban', icone: LayoutGrid, rotulo: 'Kanban', rotuloMobile: 'Kanban', titulo: 'Quadro Kanban' },
  { aba: 'tabela', icone: ListFilter, rotulo: 'Tabela', rotuloMobile: 'Tabela', titulo: 'Tabela Operacional' },
  { aba: 'dashboard', icone: BarChart3, rotulo: 'Dashboard', rotuloMobile: 'Métricas', titulo: 'Dashboard Executivo' },
  { aba: 'historico', icone: History, rotulo: 'Histórico', rotuloMobile: 'Histórico', titulo: 'Histórico' },
];

export const Navbar: React.FC<NavbarProps> = ({
  abaAtiva,
  setAbaAtiva,
  onAbrirNovaEntrada,
  onAbrirImportar,
  metricas,
}) => {
  const { usuario, logout } = useAuth();

  const totalPatio = metricas?.totalVeiculosPatio ?? 0;
  const emAtraso = metricas?.veiculosEmAtraso ?? 0;

  return (
    <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 whitespace-nowrap">
        {/* Lado Esquerdo: Marca & Navegação */}
        <div className="flex items-center gap-5 min-w-0">
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20 border border-sky-400/30">
              <Car className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-white text-lg tracking-tight leading-tight">R-Fleet</span>
                <span className="text-[10px] uppercase font-bold tracking-wider bg-sky-500/20 text-sky-400 border border-sky-500/30 px-1.5 rounded font-mono">
                  PRO
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-none">Gestão de Oficina</p>
            </div>
          </div>

          {/* Abas: só ícones em telas médias, ícone + rótulo a partir de lg */}
          <nav aria-label="Seções" className="hidden md:flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
            {ABAS.map(({ aba, icone: Icone, rotulo, titulo }) => (
              <button
                key={aba}
                onClick={() => setAbaAtiva(aba)}
                title={titulo}
                aria-label={titulo}
                aria-current={abaAtiva === aba ? 'page' : undefined}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                  abaAtiva === aba
                    ? 'bg-sky-500/20 text-sky-300 border-sky-500/30 shadow-sm'
                    : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icone className="w-4 h-4 shrink-0" />
                <span className="hidden lg:inline">{rotulo}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Lado Direito: Pílulas de Status e Ações */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Badge de Pátio e Atraso */}
          <div className="hidden xl:flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
            <span className="text-slate-400">
              Pátio <strong className="text-slate-100 font-mono font-bold">{totalPatio}</strong>
            </span>
            <span className="text-slate-700">|</span>
            <span className={`flex items-center gap-1 ${emAtraso > 0 ? 'text-rose-400 font-semibold' : 'text-slate-400'}`}>
              {emAtraso > 0 && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </span>
              )}
              {emAtraso > 0 && <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />}
              <span>
                <strong className={`font-mono font-bold ${emAtraso > 0 ? '' : 'text-slate-100'}`}>{emAtraso}</strong> em
                atraso
              </span>
            </span>
          </div>

          {/* Botão Importar Planilha */}
          <button
            onClick={onAbrirImportar}
            aria-label="Importar planilha"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all cursor-pointer"
            title="Importar dados de planilha Excel ou CSV antiga"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span className="hidden lg:inline">Importar</span>
          </button>

          {/* Botão Nova Entrada (< 30s) */}
          <button
            onClick={onAbrirNovaEntrada}
            aria-label="Nova entrada"
            title="Registrar a entrada de um veículo"
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-lg shadow-emerald-500/20 border border-emerald-400/30 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nova Entrada</span>
          </button>

          {/* Perfil & Logout */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <span
              className="hidden xl:block text-xs font-semibold text-slate-200 truncate max-w-[140px]"
              title={usuario?.email || ''}
            >
              {usuario?.nome || 'Gestor'}
            </span>
            <button
              onClick={logout}
              title="Sair do sistema"
              aria-label="Sair do sistema"
              className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Navegação Mobile (abaixo da barra em telas pequenas) */}
      <nav aria-label="Seções" className="md:hidden flex items-center justify-around border-t border-slate-800/80 bg-slate-950/80 px-2 py-1.5">
        {ABAS.map(({ aba, icone: Icone, rotuloMobile }) => (
          <button
            key={aba}
            onClick={() => setAbaAtiva(aba)}
            aria-current={abaAtiva === aba ? 'page' : undefined}
            className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium ${
              abaAtiva === aba ? 'bg-sky-500/20 text-sky-300 font-bold' : 'text-slate-400'
            }`}
          >
            <Icone className="w-4 h-4" />
            <span>{rotuloMobile}</span>
          </button>
        ))}
      </nav>
    </header>
  );
};
