import React, { useState } from 'react';
import { OrdemServico, EtapaOrdemServico } from '../types';
import { KanbanCard } from './KanbanCard';

interface KanbanBoardProps {
  ordens: OrdemServico[];
  onSelecionarOrdem: (ordem: OrdemServico) => void;
  onTransicionarEtapa: (ordemId: number, novaEtapa: EtapaOrdemServico) => void;
}

// A etapa é identificada pela posição e pelo nome; cor fica reservada para o semáforo
const COLUNAS: { etapa: EtapaOrdemServico; titulo: string }[] = [
  { etapa: 'AGUARDANDO_ORCAMENTO', titulo: 'Aguardando orçamento' },
  { etapa: 'ORCAMENTO', titulo: 'Orçamento' },
  { etapa: 'APROVADO', titulo: 'Aprovado' },
  { etapa: 'EM_SERVICO', titulo: 'Em serviço' },
  { etapa: 'FINALIZADO', titulo: 'Finalizado' },
  { etapa: 'AGUARDANDO_RETIRADA', titulo: 'Aguardando retirada' },
  { etapa: 'ENTREGUE', titulo: 'Entregue' },
];

/** Quadro de chaves: cada coluna é um trilho com as etiquetas dos carros daquela etapa. */
export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  ordens,
  onSelecionarOrdem,
  onTransicionarEtapa,
}) => {
  const [dragOverCol, setDragOverCol] = useState<EtapaOrdemServico | null>(null);

  const colunaSeguinte = (etapaAtual: EtapaOrdemServico) => {
    const idx = COLUNAS.findIndex((c) => c.etapa === etapaAtual);
    return idx >= 0 ? COLUNAS[idx + 1] : undefined;
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

  return (
    <div className="w-full overflow-x-auto pb-6 snap-x snap-mandatory md:snap-none">
      <div className="flex gap-5 w-max">
        {COLUNAS.map((coluna) => {
          const ordensNaColuna = ordens.filter((o) => o.etapa === coluna.etapa);
          const parados = ordensNaColuna.filter((o) => o.statusSla === 'VERMELHO').length;
          const isDragOver = dragOverCol === coluna.etapa;

          return (
            <section
              key={coluna.etapa}
              aria-label={coluna.titulo}
              onDragOver={(e) => handleDragOver(e, coluna.etapa)}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={(e) => handleDrop(e, coluna.etapa)}
              className={`w-[264px] shrink-0 snap-start flex flex-col rounded-md transition-colors ${
                isDragOver ? 'bg-mercosul/5' : ''
              }`}
            >
              {/* Cabeçalho e trilho */}
              <div className="px-1">
                <div className="flex items-baseline gap-2">
                  <h3 className="font-placa text-[18px] leading-tight font-semibold text-grafite">{coluna.titulo}</h3>
                  <span className="font-placa tabular-nums text-[18px] text-aco">{ordensNaColuna.length}</span>
                  {parados > 0 && (
                    <span className="ml-auto text-[13px] font-semibold text-vermelho">
                      {parados} {parados === 1 ? 'parado' : 'parados'}
                    </span>
                  )}
                </div>
                <div
                  aria-hidden="true"
                  className={`mt-2 h-[3px] rounded-full transition-colors ${isDragOver ? 'bg-mercosul' : 'bg-grafite'}`}
                />
              </div>

              {/* Etiquetas penduradas no trilho */}
              <div className="flex-1 px-1 pt-3 pb-2 space-y-3 overflow-y-auto max-h-[calc(100vh-200px)] min-h-[420px]">
                {ordensNaColuna.length === 0 ? (
                  <p className="pt-2 text-[14px] text-aco">Nenhum carro nesta etapa</p>
                ) : (
                  ordensNaColuna.map((ordem) => (
                    <KanbanCard
                      key={ordem.id}
                      ordem={ordem}
                      onSelecionar={onSelecionarOrdem}
                      onAvancarEtapa={(o) => {
                        const prox = colunaSeguinte(o.etapa);
                        if (prox) onTransicionarEtapa(o.id, prox.etapa);
                      }}
                      tituloEtapaSeguinte={colunaSeguinte(ordem.etapa)?.titulo}
                    />
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};
