import React from 'react';
import { OrdemServico } from '../types';
import { PlacaBadge } from './PlacaBadge';
import { AlertTriangle, Check } from 'lucide-react';
import { etapaInfo, ETAPAS } from '../utils/etapas';

interface KanbanCardProps {
  ordem: OrdemServico;
  onSelecionar: (ordem: OrdemServico) => void;
  onAvancarEtapa: (ordem: OrdemServico) => void;
  /** Próxima etapa; sem ela (última etapa) o botão de mover some */
  etapaSeguinte?: (typeof ETAPAS)[number];
}

const formatarMoeda = (valor: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);

/** Selo do semáforo de prazo: sempre com texto, a cor só reforça */
const SeloPrazo: React.FC<{ ordem: OrdemServico }> = ({ ordem }) => {
  const dias = `${ordem.diasNoPatio} ${ordem.diasNoPatio === 1 ? 'dia' : 'dias'}`;
  const base = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-[3px] text-[13px] font-semibold';
  if (ordem.statusSla === 'VERMELHO') {
    return (
      <span className={`${base} bg-vermelho/12 text-vermelho`}>
        <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
        {dias} parado
      </span>
    );
  }
  if (ordem.statusSla === 'AMARELO') {
    return <span className={`${base} bg-amarelo/20 text-amarelo-tinta`}>{dias} no pátio</span>;
  }
  return (
    <span className={`${base} bg-verde/12 text-verde`}>
      <Check className="w-3.5 h-3.5" aria-hidden="true" />
      Pronto, {dias}
    </span>
  );
};

/** Etiqueta de chave: um carro pendurado na etapa em que está. A cabeça tem a cor da etapa. */
export const KanbanCard: React.FC<KanbanCardProps> = ({ ordem, onSelecionar, onAvancarEtapa, etapaSeguinte }) => {
  const etapa = etapaInfo(ordem.etapa);
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
      className="group relative cursor-pointer select-none rounded-[2px] transition-transform active:scale-[0.98] has-[h4_button:focus-visible]:outline-2 has-[h4_button:focus-visible]:outline-offset-2 has-[h4_button:focus-visible]:outline-mercosul"
    >
      {/* Ilhós: o furo reforçado por onde a etiqueta fica pendurada */}
      <span
        aria-hidden="true"
        className="absolute top-[7px] left-1/2 -translate-x-1/2 z-10 w-3 h-3 rounded-full bg-parede ring-[2.5px] ring-white/70"
      />

      <div className="etiqueta-borda bg-trilho p-px transition-colors group-hover:bg-aco">
        <div className="etiqueta-face bg-etiqueta">
          <div aria-hidden="true" className={`h-[26px] ${etapa.fundo}`} />

          <div className="px-3.5 pt-3">
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

            <div className="mt-2.5">
              <SeloPrazo ordem={ordem} />
            </div>

            <div className="mt-2 pb-3 flex items-baseline justify-between gap-2">
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
          </div>

          {etapaSeguinte && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAvancarEtapa(ordem);
              }}
              className={`w-full border-t border-trilho px-3.5 py-2.5 text-left text-[14px] font-semibold ${etapaSeguinte.texto} hover:bg-parede/60 focus-visible:-outline-offset-4 cursor-pointer`}
            >
              Mover para {etapaSeguinte.titulo}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
