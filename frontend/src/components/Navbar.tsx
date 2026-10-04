import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LayoutGrid, ListFilter, BarChart3, Plus, FileSpreadsheet, LogOut, History, LucideIcon } from 'lucide-react';
import { AbaApp, DashboardMetricas } from '../types';

interface NavbarProps {
  abaAtiva: AbaApp;
  setAbaAtiva: (aba: AbaApp) => void;
  onAbrirNovaEntrada: () => void;
  onAbrirImportar: () => void;
  metricas?: DashboardMetricas | null;
}

const ABAS: { aba: AbaApp; icone: LucideIcon; rotulo: string }[] = [
  { aba: 'kanban', icone: LayoutGrid, rotulo: 'Quadro' },
  { aba: 'tabela', icone: ListFilter, rotulo: 'Tabela' },
  { aba: 'dashboard', icone: BarChart3, rotulo: 'Painel' },
  { aba: 'historico', icone: History, rotulo: 'Histórico' },
];

// Aba ativa sublinhada com o mesmo trilho do quadro, em azul
const classeAba = (ativa: boolean) =>
  `relative flex items-center gap-1.5 h-full px-1 text-[15px] cursor-pointer transition-colors after:absolute after:inset-x-0 after:bottom-0 after:h-[3px] after:rounded-full ${
    ativa ? 'text-grafite font-semibold after:bg-mercosul' : 'text-aco hover:text-grafite after:bg-transparent'
  }`;

export const Navbar: React.FC<NavbarProps> = ({
  abaAtiva,
  setAbaAtiva,
  onAbrirNovaEntrada,
  onAbrirImportar,
  metricas,
}) => {
  const { usuario, logout } = useAuth();

  const totalPatio = metricas?.totalVeiculosPatio ?? 0;
  const parados = metricas?.veiculosEmAtraso ?? 0;

  return (
    <header className="sticky top-0 z-30 bg-etiqueta border-b border-trilho">
      <div className="max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4 whitespace-nowrap">
        <div className="flex items-center gap-8 h-full min-w-0">
          <span className="font-placa text-[24px] font-bold leading-none text-grafite">R-Fleet</span>

          {/* Só ícones em telas médias, ícone + nome a partir de lg */}
          <nav aria-label="Seções" className="hidden md:flex items-center gap-6 h-full">
            {ABAS.map(({ aba, icone: Icone, rotulo }) => (
              <button
                key={aba}
                onClick={() => setAbaAtiva(aba)}
                title={rotulo}
                aria-label={rotulo}
                aria-current={abaAtiva === aba ? 'page' : undefined}
                className={classeAba(abaAtiva === aba)}
              >
                <Icone className="w-4 h-4 shrink-0 lg:hidden" aria-hidden="true" />
                <span className="hidden lg:inline">{rotulo}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <p className="hidden xl:flex items-baseline gap-3 text-[15px] text-aco">
            <span>
              <strong className="font-placa tabular-nums text-[18px] font-semibold text-grafite">{totalPatio}</strong> no
              pátio
            </span>
            {parados > 0 && (
              <span className="px-2 py-0.5 rounded-[3px] bg-vermelho text-white font-semibold">
                <span className="font-placa tabular-nums">{parados}</span> {parados === 1 ? 'parado' : 'parados'}
              </span>
            )}
          </p>

          <button
            onClick={onAbrirImportar}
            title="Importar planilha Excel ou CSV"
            aria-label="Importar planilha"
            className="flex items-center gap-1.5 px-3 py-2 rounded-md border border-trilho text-grafite text-[14px] font-medium hover:border-aco transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-aco" aria-hidden="true" />
            <span className="hidden lg:inline">Importar planilha</span>
          </button>

          <button
            onClick={onAbrirNovaEntrada}
            aria-label="Registrar entrada"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-mercosul hover:bg-mercosul/90 text-white text-[14px] font-semibold transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">Registrar entrada</span>
          </button>

          <div className="flex items-center gap-1 pl-3 border-l border-trilho">
            <span className="hidden xl:block text-[14px] text-grafite truncate max-w-[140px]" title={usuario?.email || ''}>
              {usuario?.nome || 'Gestor'}
            </span>
            <button
              onClick={logout}
              title="Sair"
              aria-label="Sair"
              className="p-2 rounded-md text-aco hover:text-vermelho transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {/* Navegação no celular, logo abaixo da barra */}
      <nav aria-label="Seções" className="md:hidden flex items-stretch justify-around h-11 border-t border-trilho px-2">
        {ABAS.map(({ aba, icone: Icone, rotulo }) => (
          <button
            key={aba}
            onClick={() => setAbaAtiva(aba)}
            aria-current={abaAtiva === aba ? 'page' : undefined}
            className={classeAba(abaAtiva === aba)}
          >
            <Icone className="w-4 h-4" aria-hidden="true" />
            <span>{rotulo}</span>
          </button>
        ))}
      </nav>
    </header>
  );
};
