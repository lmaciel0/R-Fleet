import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LayoutGrid, Table2, BarChart3, Plus, FileSpreadsheet, LogOut, History, Moon, Sun, Search, LucideIcon } from 'lucide-react';
import { AbaApp, DashboardMetricas } from '../types';
import { useTema } from '../utils/tema';
import { Marca } from './Marca';
import { MenuMais } from './MenuMais';

interface NavbarProps {
  abaAtiva: AbaApp;
  setAbaAtiva: (aba: AbaApp) => void;
  onAbrirNovaEntrada: () => void;
  onAbrirImportar: () => void;
  onAbrirBusca: () => void;
  metricas?: DashboardMetricas | null;
}

const ABAS: { aba: AbaApp; icone: LucideIcon; rotulo: string }[] = [
  { aba: 'kanban', icone: LayoutGrid, rotulo: 'Quadro' },
  { aba: 'tabela', icone: Table2, rotulo: 'Tabela' },
  { aba: 'dashboard', icone: BarChart3, rotulo: 'Painel' },
  { aba: 'historico', icone: History, rotulo: 'Histórico' },
];

// Em tela de toque (tablet, celular deitado) os alvos chegam a 44px; com mouse ficam compactos
const alvoToque = 'pointer-coarse:min-h-11 pointer-coarse:min-w-11';

// Abas em pílula, como no R-Fleet original: a ativa acende em azul e ganha uma barra embaixo,
// para não depender só de cor (o fundo azul sobre o marinho tem pouco contraste)
const classeAba = (ativa: boolean) =>
  `relative flex items-center justify-center gap-2 px-3 py-1.5 ${alvoToque} text-[14px] rounded-md border cursor-pointer transition-colors after:absolute after:inset-x-3 after:bottom-0.5 after:h-0.5 after:rounded-full ${
    ativa
      ? 'bg-acao/25 border-acao/50 text-noite-texto font-semibold after:bg-acao-noite'
      : 'border-transparent text-noite-suave hover:text-noite-texto hover:bg-noite-alto'
  }`;

/** Barra de navegação. Fica na noite (azul-marinho) nos dois temas. */
export const Navbar: React.FC<NavbarProps> = ({
  abaAtiva,
  setAbaAtiva,
  onAbrirNovaEntrada,
  onAbrirImportar,
  onAbrirBusca,
  metricas,
}) => {
  const { usuario, logout } = useAuth();
  const { tema, alternar } = useTema();
  const rotuloTema = tema === 'escuro' ? 'Usar tema claro' : 'Usar tema escuro';

  const totalPatio = metricas?.totalVeiculosPatio ?? 0;
  const parados = metricas?.veiculosEmAtraso ?? 0;

  return (
    <header className="sticky top-0 z-30 bg-noite text-noite-texto border-b border-noite-borda shadow-[0_6px_24px_-12px_rgb(0_0_0/0.5)]">
      <div className="foco-noite px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 whitespace-nowrap">
        <div className="flex items-center gap-6 min-w-0">
          <Marca />

          {/* Só ícones em telas médias, ícone + nome a partir de lg */}
          <nav
            aria-label="Seções"
            className="hidden md:flex items-center gap-1 p-1 rounded-lg bg-black/25 border border-noite-borda"
          >
            {ABAS.map(({ aba, icone: Icone, rotulo }) => (
              <button
                key={aba}
                onClick={() => setAbaAtiva(aba)}
                title={rotulo}
                aria-label={rotulo}
                aria-current={abaAtiva === aba ? 'page' : undefined}
                className={classeAba(abaAtiva === aba)}
              >
                <Icone className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span className="hidden lg:inline">{rotulo}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Busca de placa: campo aparente a partir de 1700px, só a lupa nas demais (atalho Ctrl+K). Os limites de largura
              desta barra (busca, rótulo de Importar, contador, nome) foram medidos para as peças não se sobreporem. */}
          <button
            onClick={onAbrirBusca}
            title="Buscar placa (Ctrl+K)"
            aria-label="Buscar placa"
            aria-keyshortcuts="Control+K"
            className={`flex items-center justify-center md:justify-start gap-2 w-11 h-11 md:w-auto md:h-auto ${alvoToque} p-2 min-[1700px]:pl-3 min-[1700px]:pr-2 min-[1700px]:w-52 rounded-md border border-noite-borda bg-black/25 text-noite-suave hover:text-noite-texto hover:border-noite-suave/50 transition-colors cursor-pointer`}
          >
            <Search className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span className="hidden min-[1700px]:inline text-[14px]">Buscar placa</span>
            <kbd className="hidden min-[1700px]:inline ml-auto px-1.5 rounded border border-noite-borda font-sans text-[12px]">Ctrl K</kbd>
          </button>

          {/* Só com os números carregados: antes disso mostraria "0 no pátio" */}
          <p className={`hidden ${metricas ? 'xl:flex' : ''} items-center gap-3 px-3 py-1.5 rounded-lg bg-black/25 border border-noite-borda text-[14px] text-noite-suave`}>
            <span>
              <strong className="font-placa tabular-nums text-[17px] font-semibold text-noite-texto">{totalPatio}</strong>{' '}
              no pátio
            </span>
            {parados > 0 && (
              <>
                <span aria-hidden="true" className="w-px h-4 bg-noite-borda" />
                <span className="flex items-center gap-1.5 font-semibold text-alerta-noite">
                  {/* Ponto que pulsa enquanto houver carro parado além do limite */}
                  <span aria-hidden="true" className="relative flex w-2 h-2">
                    <span className="absolute inset-0 rounded-full bg-alerta-noite opacity-70 animate-ping" />
                    <span className="relative w-2 h-2 rounded-full bg-alerta-noite" />
                  </span>
                  <span>
                    <span className="font-placa tabular-nums text-[17px]">{parados}</span>{' '}
                    {parados === 1 ? 'parado' : 'parados'}
                  </span>
                </span>
              </>
            )}
          </p>

          <button
            onClick={onAbrirImportar}
            title="Importar planilha Excel ou CSV"
            aria-label="Importar planilha"
            className={`hidden md:flex items-center justify-center gap-1.5 px-3 py-2 ${alvoToque} rounded-md border border-noite-borda bg-noite-alto/60 text-noite-texto text-[14px] font-medium hover:bg-noite-alto hover:border-noite-suave/50 transition-colors cursor-pointer`}
          >
            <FileSpreadsheet className="w-4 h-4 text-[#5cc98a]" aria-hidden="true" />
            <span className="hidden min-[1440px]:inline">Importar planilha</span>
          </button>

          <button
            onClick={onAbrirNovaEntrada}
            aria-label="Registrar entrada"
            className={`hidden md:flex items-center justify-center gap-1.5 px-3.5 py-2 ${alvoToque} rounded-md bg-acao hover:bg-acao-forte active:bg-acao-forte text-white text-[14px] font-semibold border border-white/15 shadow-[0_0_22px_-6px_rgb(37_99_235/0.9)] transition-colors cursor-pointer`}
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span className="hidden lg:inline">Registrar entrada</span>
          </button>

          <MenuMais
            tema={tema}
            nome={usuario?.nome || 'Gestor'}
            email={usuario?.email || ''}
            onImportar={onAbrirImportar}
            onAlternarTema={alternar}
            onSair={logout}
          />

          <div className="hidden md:flex items-center gap-1 pl-3 border-l border-noite-borda">
            <span
              className="hidden xl:block mr-1 text-[14px] font-medium text-noite-texto truncate max-w-[140px]"
              title={usuario?.email || ''}
            >
              {usuario?.nome || 'Gestor'}
            </span>
            <button
              onClick={alternar}
              title={rotuloTema}
              aria-label={rotuloTema}
              className={`flex items-center justify-center p-2 ${alvoToque} rounded-md text-noite-suave hover:text-noite-texto hover:bg-noite-alto transition-colors cursor-pointer`}
            >
              {tema === 'escuro' ? <Sun className="w-4 h-4" aria-hidden="true" /> : <Moon className="w-4 h-4" aria-hidden="true" />}
            </button>
            <button
              onClick={logout}
              title="Sair"
              aria-label="Sair"
              className={`flex items-center justify-center p-2 ${alvoToque} rounded-md text-noite-suave hover:text-alerta-noite hover:bg-noite-alto transition-colors cursor-pointer`}
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {/* Navegação do celular: dock em pílula, solta das bordas e fixa embaixo, ao alcance do polegar.
          A aba ativa vira um oval escuro que mostra o nome (o ícone sozinho não distingue as abas no tema
          escuro); o "+" no meio é a ação mais frequente, "registrar entrada". O conteúdo reserva o espaço
          dela (ver App.tsx). */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-30 flex justify-center px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pointer-events-none">
        <nav
          aria-label="Seções"
          className="pointer-events-auto flex w-full max-w-md items-center gap-1 p-2 rounded-full bg-dock border border-trilho shadow-[0_10px_30px_-8px_rgb(0_0_0/0.35)]"
        >
          {ABAS.map(({ aba, icone: Icone, rotulo }, i) => {
            const ativa = abaAtiva === aba;
            return (
              <React.Fragment key={aba}>
                {i === 2 && (
                  <button
                    onClick={onAbrirNovaEntrada}
                    aria-label="Registrar entrada"
                    className="flex shrink-0 items-center justify-center w-12 h-12 mx-0.5 rounded-full bg-acao active:bg-acao-forte text-white border border-white/15 shadow-[0_6px_16px_-4px_rgb(37_99_235/0.8)] touch-manipulation cursor-pointer transition-colors"
                  >
                    <Plus className="w-6 h-6" aria-hidden="true" />
                  </button>
                )}
                <button
                  onClick={() => setAbaAtiva(aba)}
                  aria-label={rotulo}
                  aria-current={ativa ? 'page' : undefined}
                  className={`flex items-center justify-center gap-2 h-12 min-w-11 rounded-full border touch-manipulation cursor-pointer transition-colors ${
                    ativa
                      ? 'flex-[2.6] px-2.5 bg-noite border-acao-noite/50 text-acao-noite'
                      : 'flex-1 border-transparent text-aco active:bg-parede'
                  }`}
                >
                  <Icone className="w-6 h-6 shrink-0" aria-hidden="true" />
                  {/* Abaixo de 360px não sobra largura para o nome sem vazar do oval: fica só o ícone */}
                  {ativa && <span className="hidden min-[360px]:inline text-[14px] font-semibold whitespace-nowrap">{rotulo}</span>}
                </button>
              </React.Fragment>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
