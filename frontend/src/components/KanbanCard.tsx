import React from 'react';
import { OrdemServico } from '../types';
import { PlacaBadge } from './PlacaBadge';
import { AlertTriangle, Building2, Check, ChevronRight, Wrench } from 'lucide-react';
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
  const parado = ordem.statusSla === 'VERMELHO';

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', String(ordem.id));
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={() => onSelecionar(ordem)}
      // A sombra vai num filtro do contêiner porque o clip-path do chanfro cortaria um box-shadow
      className={`group relative cursor-pointer select-none rounded-[2px] transition-transform active:scale-[0.98] has-[h4_button:focus-visible]:outline-2 has-[h4_button:focus-visible]:outline-offset-2 has-[h4_button:focus-visible]:outline-mercosul ${
        parado
          ? 'drop-shadow-[0_0_10px_rgb(220_38_38/0.35)]'
          : 'drop-shadow-[0_2px_3px_rgb(15_23_42/0.14)]'
      }`}
    >
      {/* Ilhós: o furo reforçado por onde a etiqueta fica pendurada */}
      <span
        aria-hidden="true"
        className="absolute top-[3px] left-1/2 -translate-x-1/2 z-10 w-2.5 h-2.5 rounded-full bg-parede ring-2 ring-white/60"
      />

      <div
        className={`etiqueta-borda p-px transition-colors ${
          parado ? 'bg-vermelho/80 group-hover:bg-vermelho' : 'bg-trilho group-hover:bg-aco'
        }`}
      >
        <div className="etiqueta-face bg-etiqueta">
          <div aria-hidden="true" className={`h-4 ${etapa.fundo}`} />

          <div className="px-3 pt-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-placa tabular-nums text-[14px] font-semibold text-aco">
                OS {String(ordem.id).padStart(5, '0')}
              </span>
              <PlacaBadge placa={ordem.placa} mercosul={ordem.mercosul} size="md" />
            </div>

            <h4 className="mt-2 text-[16px] leading-snug font-semibold text-grafite line-clamp-1">
              {/* Botão para o teclado: o clique dele sobe até a etiqueta. O contorno de foco vai na etiqueta inteira
                  (has-[...] no contêiner), porque o clip-path do chanfro cortaria um contorno desenhado aqui dentro */}
              <button type="button" className="text-left cursor-pointer focus-visible:outline-none">
                {ordem.modelo}
              </button>
            </h4>

            {(ordem.origemNome || ordem.tipoServicoNome) && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {ordem.origemNome && (
                  <span className="inline-flex items-center gap-1 max-w-full px-1.5 py-0.5 rounded-[4px] border border-trilho bg-parede/60 text-[12px] font-medium text-aco">
                    <Building2 className="w-3 h-3 shrink-0" aria-hidden="true" />
                    <span className="truncate">{ordem.origemNome}</span>
                  </span>
                )}
                {ordem.tipoServicoNome && (
                  <span className="inline-flex items-center gap-1 max-w-full px-1.5 py-0.5 rounded-[4px] border border-mercosul/25 bg-mercosul/8 text-[12px] font-medium text-mercosul">
                    <Wrench className="w-3 h-3 shrink-0" aria-hidden="true" />
                    <span className="truncate">{ordem.tipoServicoNome}</span>
                  </span>
                )}
              </div>
            )}

            <div className="mt-2.5 pt-2 pb-2.5 border-t border-trilho/70 flex items-center justify-between gap-2">
              <SeloPrazo ordem={ordem} />
              {ordem.valorOrcamento > 0 && ordem.faturado ? (
                <span className="inline-flex items-center gap-0.5 text-[13px] font-medium text-verde">
                  <Check className="w-3.5 h-3.5" aria-hidden="true" />
                  Faturado
                </span>
              ) : ordem.valorOrcamento > 0 ? (
                <span className="text-[13px] text-aco">A faturar</span>
              ) : null}
            </div>

            <div className="pb-2.5">
              {ordem.valorOrcamento > 0 ? (
                <span className="font-placa tabular-nums text-[18px] font-semibold text-grafite">
                  {formatarMoeda(ordem.valorOrcamento)}
                </span>
              ) : (
                <span className="text-[14px] text-aco">Sem orçamento</span>
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
              className={`w-full flex items-center gap-2 border-t border-trilho px-3 py-2 text-left text-[14px] font-semibold ${etapaSeguinte.texto} hover:bg-parede/60 focus-visible:-outline-offset-4 cursor-pointer`}
            >
              <span aria-hidden="true" className={`w-2 h-2 rounded-full shrink-0 ${etapaSeguinte.fundo}`} />
              <span className="truncate">Mover para {etapaSeguinte.titulo}</span>
              <ChevronRight className="w-4 h-4 ml-auto shrink-0 opacity-60 group-hover:opacity-100" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
