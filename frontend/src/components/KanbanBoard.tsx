import React, { useState } from 'react';
import { OrdemServico, EtapaOrdemServico } from '../types';
import { KanbanCard } from './KanbanCard';

interface KanbanBoardProps {
  ordens: OrdemServico[];
  onSelecionarOrdem: (ordem: OrdemServico) => void;
  onTransicionarEtapa: (ordemId: number, novaEtapa: EtapaOrdemServico) => void;
}

interface ColunaDef {
  etapa: EtapaOrdemServico;
  titulo: string;
  corBorda: string;
  corTag: string;
}

const COLUNAS: ColunaDef[] = [
  {
    etapa: 'AGUARDANDO_ORCAMENTO',
    titulo: 'Aguardando Orçamento',
    corBorda: 'border-slate-500/40',
    corTag: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  },
  {
    etapa: 'ORCAMENTO',
    titulo: 'Orçamento',
    corBorda: 'border-blue-500/40',
    corTag: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  },
  {
    etapa: 'APROVADO',
    titulo: 'Aprovado',
    corBorda: 'border-teal-500/40',
    corTag: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
  },
  {
    etapa: 'EM_SERVICO',
    titulo: 'Em Serviço',
    corBorda: 'border-amber-500/40',
    corTag: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  },
  {
    etapa: 'FINALIZADO',
    titulo: 'Finalizado',
    corBorda: 'border-purple-500/40',
    corTag: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  },
  {
    etapa: 'AGUARDANDO_RETIRADA',
    titulo: 'Aguardando Retirada',
    corBorda: 'border-emerald-500/40',
    corTag: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  },
  {
    etapa: 'ENTREGUE',
    titulo: 'Entregue',
    corBorda: 'border-zinc-600/40',
    corTag: 'bg-zinc-700/30 text-zinc-300 border-zinc-600/30',
  },
];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  ordens,
  onSelecionarOrdem,
  onTransicionarEtapa,
}) => {
  const [dragOverCol, setDragOverCol] = useState<EtapaOrdemServico | null>(null);

  const getEtapaSeguinte = (etapaAtual: EtapaOrdemServico): EtapaOrdemServico | undefined => {
    const idx = COLUNAS.findIndex((c) => c.etapa === etapaAtual);
    if (idx >= 0 && idx < COLUNAS.length - 1) {
      return COLUNAS[idx + 1].etapa;
    }
    return undefined;
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

  const handleDragLeave = () => {
    setDragOverCol(null);
  };

  return (
    <div className="w-full overflow-x-auto pb-6">
      <div className="flex gap-4 min-w-[1750px] px-1">
        {COLUNAS.map((coluna) => {
          const ordensNaColuna = ordens.filter((o) => o.etapa === coluna.etapa);
          const isDragOver = dragOverCol === coluna.etapa;

          return (
            <div
              key={coluna.etapa}
              onDragOver={(e) => handleDragOver(e, coluna.etapa)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, coluna.etapa)}
              className={`flex-1 min-w-[240px] max-w-[270px] bg-slate-950/60 rounded-2xl border flex flex-col transition-all duration-200 ${
                isDragOver
                  ? 'border-sky-500 bg-sky-950/20 shadow-lg shadow-sky-500/10'
                  : 'border-slate-800/80'
              }`}
            >
              {/* Cabeçalho da Coluna */}
              <div className="p-3.5 border-b border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full border ${coluna.corBorda} bg-current`} />
                  <h3 className="text-xs font-bold text-slate-200 tracking-wide uppercase">
                    {coluna.titulo}
                  </h3>
                </div>
                <span
                  className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md border ${coluna.corTag}`}
                >
                  {ordensNaColuna.length}
                </span>
              </div>

              {/* Lista de Cards da Etapa */}
              <div className="flex-1 p-2.5 space-y-2.5 overflow-y-auto max-h-[calc(100vh-210px)] min-h-[450px]">
                {ordensNaColuna.length === 0 ? (
                  <div className="h-40 flex flex-col items-center justify-center text-center p-4 border border-dashed border-slate-800 rounded-xl text-slate-400 text-xs">
                    <span>Nenhum veículo</span>
                    <span className="text-[11px] opacity-70">nesta etapa</span>
                  </div>
                ) : (
                  ordensNaColuna.map((ordem) => (
                    <KanbanCard
                      key={ordem.id}
                      ordem={ordem}
                      onSelecionar={onSelecionarOrdem}
                      onAvancarEtapa={(o) => {
                        const prox = getEtapaSeguinte(o.etapa);
                        if (prox) onTransicionarEtapa(o.id, prox);
                      }}
                      etapaSeguinte={getEtapaSeguinte(ordem.etapa)}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
