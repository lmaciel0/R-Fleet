import React from 'react';
import { OrdemServico } from '../types';
import { PlacaBadge } from './PlacaBadge';
import { AlertTriangle, Check } from 'lucide-react';

interface KanbanCardProps {
  ordem: OrdemServico;
  onSelecionar: (ordem: OrdemServico) => void;
  onAvancarEtapa: (ordem: OrdemServico) => void;
  /** Nome da próxima etapa; sem ele (última etapa) o botão de mover some */
  tituloEtapaSeguinte?: string;
}

// Faixa do semáforo na borda esquerda da etiqueta
const FAIXA: Record<OrdemServico['statusSla'], string> = {
  VERMELHO: 'shadow-[inset_5px_0_0_var(--color-vermelho)]',
  AMARELO: 'shadow-[inset_5px_0_0_var(--color-amarelo)]',
  VERDE: 'shadow-[inset_5px_0_0_var(--color-verde)]',
};

const formatarMoeda = (valor: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);

/** Etiqueta de chave: um carro pendurado na etapa em que está. */
export const KanbanCard: React.FC<KanbanCardProps> = ({
  ordem,
  onSelecionar,
  onAvancarEtapa,
  tituloEtapaSeguinte,
}) => {
  const dias = `${ordem.diasNoPatio} ${ordem.diasNoPatio === 1 ? 'dia' : 'dias'}`;
  const origemEServico = [ordem.origemNome, ordem.tipoServicoNome].filter(Boolean).join(', ');

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', String(ordem.id));
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={() => onSelecionar(ordem)}
      className="group relative cursor-pointer select-none rounded-[2px] has-[h4_button:focus-visible]:outline-2 has-[h4_button:focus-visible]:outline-offset-2 has-[h4_button:focus-visible]:outline-mercosul"
    >
      {/* Ilhós: o furo reforçado por onde a etiqueta fica pendurada */}
      <span
        aria-hidden="true"
        className="absolute top-[7px] left-1/2 -translate-x-1/2 z-10 w-3 h-3 rounded-full bg-parede ring-[2.5px] ring-aco/45"
      />

      <div className="etiqueta-borda bg-trilho p-px transition-colors group-hover:bg-aco">
        <div className={`etiqueta-face bg-etiqueta pl-4 pr-3 pt-7 ${FAIXA[ordem.statusSla]}`}>
          <div className="flex justify-center">
            <PlacaBadge placa={ordem.placa} mercosul={ordem.mercosul} size="lg" />
          </div>

          <h4 className="mt-3 text-[16px] leading-snug font-semibold text-grafite line-clamp-1">
            {/* Botão para o teclado: o clique dele sobe até a etiqueta. O contorno de foco vai na etiqueta inteira
                (has-[...] no contêiner), porque o clip-path do chanfro cortaria um contorno desenhado aqui dentro */}
            <button type="button" className="text-left cursor-pointer focus-visible:outline-none">
              {ordem.modelo}
            </button>
          </h4>
          {origemEServico && <p className="text-[13px] text-aco line-clamp-1">{origemEServico}</p>}

          <p className="mt-2.5 text-[14px] font-semibold flex items-center gap-1">
            {ordem.statusSla === 'VERMELHO' && (
              <>
                <AlertTriangle className="w-4 h-4 text-vermelho shrink-0" aria-hidden="true" />
                <span className="text-vermelho">{dias} parado</span>
              </>
            )}
            {ordem.statusSla === 'AMARELO' && <span className="text-amarelo-tinta">{dias} no pátio</span>}
            {ordem.statusSla === 'VERDE' && (
              <span className="text-verde">
                Pronto<span className="font-normal text-aco">, {dias} no pátio</span>
              </span>
            )}
          </p>

          <div className="mt-1 pb-3 flex items-baseline justify-between gap-2">
            {ordem.valorOrcamento > 0 ? (
              <span className="font-placa tabular-nums text-[17px] font-semibold text-grafite">
                {formatarMoeda(ordem.valorOrcamento)}
              </span>
            ) : (
              <span className="text-[14px] text-aco">Sem orçamento</span>
            )}
            {ordem.valorOrcamento <= 0 ? null : ordem.faturado ? (
              <span className="inline-flex items-center gap-0.5 text-[13px] font-medium text-verde">
                <Check className="w-3.5 h-3.5" aria-hidden="true" />
                Faturado
              </span>
            ) : (
              <span className="text-[13px] text-aco">A faturar</span>
            )}
          </div>

          {tituloEtapaSeguinte && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAvancarEtapa(ordem);
              }}
              className="-ml-4 -mr-3 w-[calc(100%+1.75rem)] border-t border-trilho pl-4 pr-3 py-2.5 text-left text-[14px] font-semibold text-mercosul hover:bg-mercosul/5 focus-visible:-outline-offset-4 cursor-pointer"
            >
              Mover para {tituloEtapaSeguinte}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
