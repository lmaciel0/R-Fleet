import React, { useState } from 'react';
import { AlertTriangle, ChevronsRight, FileSpreadsheet, Plus } from 'lucide-react';
import { OrdemServico, EtapaOrdemServico } from '../types';
import { KanbanCard } from './KanbanCard';
import { ETAPAS } from '../utils/etapas';
import { useTelaLarga } from '../utils/tela';

interface KanbanBoardProps {
  ordens: OrdemServico[];
  onSelecionarOrdem: (ordem: OrdemServico) => void;
  onTransicionarEtapa: (ordemId: number, novaEtapa: EtapaOrdemServico) => void;
  onRegistrarEntrada: () => void;
  onImportar: () => void;
}

/** Trilho com um gancho vazio de cada cor de etapa */
const GanchosVazios: React.FC = () => (
  <svg viewBox="0 0 300 92" className="w-[300px] max-w-full h-auto" aria-hidden="true">
    <rect x="6" y="10" width="288" height="6" rx="3" className="fill-grafite" />
    {ETAPAS.map((e, i) => {
      const x = 28 + i * 40.7;
      return (
        <g key={e.etapa} className={e.texto} fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round">
          <path d={`M${x} 16 V52 a11 11 0 0 0 22 0 V46`} />
        </g>
      );
    })}
  </svg>
);

type FiltroCelular = EtapaOrdemServico | 'PARADOS';

// A raia "Entregue" começa recolhida: no dia a dia ela só ocupa espaço. A escolha fica neste navegador.
const CHAVE_ENTREGUE = 'rfleet_entregue_aberta';
const lerEntregueAberta = () => {
  try {
    return localStorage.getItem(CHAVE_ENTREGUE) === 'sim';
  } catch {
    return false;
  }
};
const salvarEntregueAberta = (aberta: boolean) => {
  try {
    localStorage.setItem(CHAVE_ENTREGUE, aberta ? 'sim' : 'nao');
  } catch {
    // Sem armazenamento: vale só nesta visita
  }
};

/** Esqueleto do quadro enquanto os carros carregam, no lugar de um spinner */
export const QuadroFantasma: React.FC = () => (
  <div aria-busy="true" className="w-full overflow-hidden">
    <span className="sr-only">Carregando o quadro</span>
    <div aria-hidden="true" className="flex gap-4 w-max animate-pulse">
      {[3, 2, 1, 2, 1].map((cartoes, i) => (
        <div key={i} className="w-[272px] rounded-xl border border-trilho bg-etiqueta/45 overflow-hidden">
          <div className="h-1 bg-trilho" />
          <div className="px-3 py-3 flex items-center gap-2 border-b border-trilho/70">
            <span className="w-2.5 h-2.5 rounded-full bg-trilho" />
            <span className="h-4 w-32 rounded bg-trilho" />
            <span className="ml-auto h-5 w-6 rounded bg-trilho" />
          </div>
          <div className="p-2.5 space-y-2.5">
            {Array.from({ length: cartoes }).map((_, j) => (
              <div key={j} className="rounded-[3px] bg-etiqueta border border-trilho">
                <div className="h-4 bg-trilho/70" />
                <div className="p-3 space-y-2.5">
                  <div className="flex justify-between">
                    <span className="h-4 w-16 rounded bg-trilho/70" />
                    <span className="h-8 w-24 rounded bg-trilho/70" />
                  </div>
                  <span className="block h-4 w-36 rounded bg-trilho/70" />
                  <span className="block h-5 w-28 rounded bg-trilho/50" />
                  <span className="block h-5 w-24 rounded bg-trilho/70" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

/** Quadro de chaves: cada coluna é uma raia com as etiquetas dos carros daquela etapa. */
export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  ordens,
  onSelecionarOrdem,
  onTransicionarEtapa,
  onRegistrarEntrada,
  onImportar,
}) => {
  const [dragOverCol, setDragOverCol] = useState<EtapaOrdemServico | null>(null);
  const telaLarga = useTelaLarga();
  // Celular: qual etapa a lista mostra (null = escolha automática)
  const [filtroCelular, setFiltroCelular] = useState<FiltroCelular | null>(null);
  const [entregueAberta, setEntregueAberta] = useState(lerEntregueAberta);

  const etapaSeguinte = (etapaAtual: EtapaOrdemServico) => {
    const idx = ETAPAS.findIndex((c) => c.etapa === etapaAtual);
    return idx >= 0 ? ETAPAS[idx + 1] : undefined;
  };

  const handleDrop = (e: React.DragEvent, novaEtapa: EtapaOrdemServico) => {
    e.preventDefault();
    setDragOverCol(null);
    const ordemIdStr = e.dataTransfer.getData('text/plain');
    if (!ordemIdStr) return;

    const ordemId = Number(ordemIdStr);
    const ordem = ordens.find((o) => o.id === ordemId);
    if (ordem && ordem.etapa !== novaEtapa) {
      onTransicionarEtapa(ordemId, novaEtapa);
    }
  };

  const handleDragOver = (e: React.DragEvent, etapa: EtapaOrdemServico) => {
    e.preventDefault();
    if (dragOverCol !== etapa) {
      setDragOverCol(etapa);
    }
  };

  // Pátio vazio: um convite para começar, no lugar de sete colunas vazias
  if (ordens.length === 0) {
    return (
      <div className="flex flex-col items-center text-center pt-16 pb-10 px-4">
        <GanchosVazios />
        <h2 className="mt-8 font-placa text-[31px] leading-tight font-bold text-grafite">Nenhum carro no pátio</h2>
        <p className="mt-2 max-w-[46ch] text-balance text-[16px] text-aco">
          Registre a entrada do primeiro carro, ou importe a planilha que a oficina usava para trazer os carros de uma vez.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            onClick={onRegistrarEntrada}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-md bg-mercosul hover:bg-mercosul/90 text-sobre-cor text-[15px] font-semibold cursor-pointer"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            Registrar entrada
          </button>
          <button
            onClick={onImportar}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-md border border-trilho bg-etiqueta text-grafite text-[15px] font-medium hover:border-aco cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-aco" aria-hidden="true" />
            Importar planilha
          </button>
        </div>
      </div>
    );
  }

  const cartao = (ordem: OrdemServico) => (
    <KanbanCard
      key={ordem.id}
      ordem={ordem}
      onSelecionar={onSelecionarOrdem}
      onAvancarEtapa={(o) => {
        const prox = etapaSeguinte(o.etapa);
        if (prox) onTransicionarEtapa(o.id, prox.etapa);
      }}
      etapaSeguinte={etapaSeguinte(ordem.etapa)}
    />
  );

  const parados = ordens.filter((o) => o.statusSla === 'VERMELHO');

  // Celular: uma etapa por vez, escolhida nos chips, em lista vertical. Abre nos parados, se houver.
  if (!telaLarga) {
    const primeiraComCarro = ETAPAS.find((e) => ordens.some((o) => o.etapa === e.etapa)) ?? ETAPAS[0];
    const filtro: FiltroCelular = filtroCelular ?? (parados.length > 0 ? 'PARADOS' : primeiraComCarro.etapa);
    const lista = filtro === 'PARADOS' ? parados : ordens.filter((o) => o.etapa === filtro);
    const titulo = filtro === 'PARADOS' ? 'Parados' : (ETAPAS.find((e) => e.etapa === filtro)?.titulo ?? '');

    const classeChip = (ativo: boolean, fundoAtivo: string) =>
      `shrink-0 snap-start flex items-center gap-2 min-h-11 pl-3 pr-2 rounded-lg border font-placa text-[15px] font-semibold cursor-pointer transition-colors ${
        ativo ? `${fundoAtivo} border-transparent text-sobre-cor` : 'bg-etiqueta border-trilho text-grafite'
      }`;

    return (
      <div className="-mx-4 sm:-mx-6">
        <div className="relative">
          <div
            role="group"
            aria-label="Etapa mostrada"
            className="flex gap-2 overflow-x-auto snap-x px-4 sm:px-6 pb-3 [scrollbar-width:none]"
          >
            {parados.length > 0 && (
              <button
                type="button"
                aria-pressed={filtro === 'PARADOS'}
                onClick={() => setFiltroCelular('PARADOS')}
                className={classeChip(filtro === 'PARADOS', 'bg-vermelho')}
              >
                <AlertTriangle className={`w-4 h-4 ${filtro === 'PARADOS' ? '' : 'text-vermelho'}`} aria-hidden="true" />
                Parados
                <span className="min-w-6 px-1 rounded-[4px] bg-black/15 text-center tabular-nums">{parados.length}</span>
              </button>
            )}
            {ETAPAS.map((e) => {
              const qtd = ordens.filter((o) => o.etapa === e.etapa).length;
              const ativo = filtro === e.etapa;
              return (
                <button
                  key={e.etapa}
                  type="button"
                  aria-pressed={ativo}
                  onClick={() => setFiltroCelular(e.etapa)}
                  className={classeChip(ativo, e.fundo)}
                >
                  {!ativo && <span aria-hidden="true" className={`w-2.5 h-2.5 rounded-full ${e.fundo}`} />}
                  {e.titulo}
                  <span
                    className={`min-w-6 px-1 rounded-[4px] text-center tabular-nums ${
                      ativo ? 'bg-black/15' : qtd > 0 ? 'bg-parede' : 'text-aco'
                    }`}
                  >
                    {qtd}
                  </span>
                </button>
              );
            })}
          </div>
          {/* Esmaecido na borda direita: indica que há mais etapas ao deslizar */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-0 top-0 bottom-3 w-8 bg-gradient-to-l from-parede to-transparent"
          />
        </div>

        <section aria-label={titulo} className="px-4 sm:px-6">
          {lista.length === 0 ? (
            <p className="py-10 rounded-lg border border-dashed border-trilho text-center text-[15px] text-aco">
              Nenhum carro em {titulo.toLowerCase()}
            </p>
          ) : (
            <div className="space-y-3">{lista.map(cartao)}</div>
          )}
        </section>
      </div>
    );
  }

  const alternarEntregue = () => {
    salvarEntregueAberta(!entregueAberta);
    setEntregueAberta(!entregueAberta);
  };

  return (
    <div className="w-full overflow-x-auto pb-4">
      <div className="flex gap-4 w-max">
        {ETAPAS.map((coluna) => {
          const ordensNaColuna = ordens.filter((o) => o.etapa === coluna.etapa);
          const paradosNaColuna = ordensNaColuna.filter((o) => o.statusSla === 'VERMELHO').length;
          const isDragOver = dragOverCol === coluna.etapa;
          const recolhivel = coluna.etapa === 'ENTREGUE';
          const recolhida = recolhivel && !entregueAberta;

          return (
            <section
              key={coluna.etapa}
              aria-label={coluna.titulo}
              onDragOver={(e) => handleDragOver(e, coluna.etapa)}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={(e) => handleDrop(e, coluna.etapa)}
              className={`relative shrink-0 flex flex-col rounded-xl border overflow-hidden transition-colors ${
                recolhida ? 'w-14' : 'w-[272px]'
              } ${isDragOver ? 'border-mercosul bg-mercosul/10' : 'border-trilho bg-etiqueta/45'}`}
            >
              {/* Trilho na cor da etapa, no topo da raia */}
              <div aria-hidden="true" className={`h-1 ${coluna.fundo}`} />

              {recolhida ? (
                // Recolhida: só a contagem e o nome na vertical; soltar um card aqui continua funcionando
                <button
                  type="button"
                  onClick={alternarEntregue}
                  aria-expanded={false}
                  aria-label={`Mostrar ${coluna.titulo.toLowerCase()} (${ordensNaColuna.length})`}
                  title={`Mostrar ${coluna.titulo.toLowerCase()}`}
                  className="flex-1 flex flex-col items-center gap-3 pt-3 text-grafite hover:bg-etiqueta/60 cursor-pointer"
                >
                  <span
                    className={`min-w-6 px-1.5 rounded-[4px] text-center font-placa tabular-nums text-[15px] font-semibold text-sobre-cor ${coluna.fundo}`}
                  >
                    {ordensNaColuna.length}
                  </span>
                  <span className="font-placa text-[17px] font-semibold [writing-mode:vertical-rl]">{coluna.titulo}</span>
                </button>
              ) : (
                <>
                  <div className="px-3 pt-2.5 pb-2.5 flex items-center gap-2 border-b border-trilho/70">
                    <span aria-hidden="true" className={`w-2.5 h-2.5 rounded-full shrink-0 ${coluna.fundo}`} />
                    <h3 className="font-placa text-[17px] leading-tight font-semibold text-grafite truncate">{coluna.titulo}</h3>
                    {paradosNaColuna > 0 && (
                      <span className="ml-auto text-[13px] font-semibold text-vermelho shrink-0">
                        {paradosNaColuna} {paradosNaColuna === 1 ? 'parado' : 'parados'}
                      </span>
                    )}
                    <span
                      className={`${paradosNaColuna > 0 ? '' : 'ml-auto'} min-w-6 px-1.5 rounded-[4px] text-center font-placa tabular-nums text-[15px] font-semibold text-sobre-cor shrink-0 ${coluna.fundo}`}
                    >
                      {ordensNaColuna.length}
                    </span>
                    {recolhivel && (
                      <button
                        type="button"
                        onClick={alternarEntregue}
                        aria-expanded={true}
                        aria-label={`Recolher ${coluna.titulo.toLowerCase()}`}
                        title="Recolher"
                        className="-mr-1 p-1 rounded-md text-aco hover:text-grafite hover:bg-parede cursor-pointer"
                      >
                        <ChevronsRight className="w-4 h-4" aria-hidden="true" />
                      </button>
                    )}
                  </div>

                  {/* Etiquetas penduradas na raia */}
                  <div className="p-2.5 space-y-2.5 overflow-y-auto max-h-[calc(100vh-200px)]">
                    {ordensNaColuna.length === 0 ? (
                      <p className="py-6 rounded-lg border border-dashed border-trilho text-center text-[14px] text-aco">
                        Nenhum carro
                      </p>
                    ) : (
                      ordensNaColuna.map(cartao)
                    )}
                  </div>
                </>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
};
