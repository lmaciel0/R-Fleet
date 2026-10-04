import React, { useState } from 'react';
import { FileSpreadsheet, Plus } from 'lucide-react';
import { OrdemServico, EtapaOrdemServico } from '../types';
import { KanbanCard } from './KanbanCard';
import { ETAPAS } from '../utils/etapas';

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

/** Quadro de chaves: cada coluna é uma raia com as etiquetas dos carros daquela etapa. */
export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  ordens,
  onSelecionarOrdem,
  onTransicionarEtapa,
  onRegistrarEntrada,
  onImportar,
}) => {
  const [dragOverCol, setDragOverCol] = useState<EtapaOrdemServico | null>(null);

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

  return (
    <div className="w-full overflow-x-auto pb-4 snap-x snap-mandatory md:snap-none">
      <div className="flex gap-4 w-max">
        {ETAPAS.map((coluna) => {
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
              className={`relative w-[272px] shrink-0 snap-start flex flex-col rounded-xl border overflow-hidden transition-colors ${
                isDragOver ? 'border-mercosul bg-mercosul/10' : 'border-trilho bg-etiqueta/45'
              }`}
            >
              {/* Trilho na cor da etapa, no topo da raia */}
              <div aria-hidden="true" className={`h-1 ${coluna.fundo}`} />

              <div className="px-3 pt-2.5 pb-2.5 flex items-center gap-2 border-b border-trilho/70">
                <span aria-hidden="true" className={`w-2.5 h-2.5 rounded-full shrink-0 ${coluna.fundo}`} />
                <h3 className="font-placa text-[17px] leading-tight font-semibold text-grafite truncate">{coluna.titulo}</h3>
                {parados > 0 && (
                  <span className="ml-auto text-[13px] font-semibold text-vermelho shrink-0">
                    {parados} {parados === 1 ? 'parado' : 'parados'}
                  </span>
                )}
                <span
                  className={`${parados > 0 ? '' : 'ml-auto'} min-w-6 px-1.5 rounded-[4px] text-center font-placa tabular-nums text-[15px] font-semibold text-sobre-cor shrink-0 ${coluna.fundo}`}
                >
                  {ordensNaColuna.length}
                </span>
              </div>

              {/* Etiquetas penduradas na raia */}
              <div className="p-2.5 space-y-2.5 overflow-y-auto max-h-[calc(100vh-200px)]">
                {ordensNaColuna.length === 0 ? (
                  <p className="py-6 rounded-lg border border-dashed border-trilho text-center text-[14px] text-aco">
                    Nenhum carro
                  </p>
                ) : (
                  ordensNaColuna.map((ordem) => (
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
