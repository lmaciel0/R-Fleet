import React from 'react';
import { OrdemServico, EtapaOrdemServico } from '../types';
import { PlacaBadge } from './PlacaBadge';
import { Clock, DollarSign, ArrowRight, CheckCircle2, AlertTriangle, Building2, Wrench } from 'lucide-react';

interface KanbanCardProps {
  ordem: OrdemServico;
  onSelecionar: (ordem: OrdemServico) => void;
  onAvancarEtapa: (ordem: OrdemServico) => void;
  etapaSeguinte?: EtapaOrdemServico;
}

export const KanbanCard: React.FC<KanbanCardProps> = ({
  ordem,
  onSelecionar,
  onAvancarEtapa,
  etapaSeguinte,
}) => {
  const isAtrasado = ordem.statusSla === 'VERMELHO';
  const isAtencao = ordem.statusSla === 'AMARELO';

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor || 0);
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', String(ordem.id));
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={() => onSelecionar(ordem)}
      className={`group relative bg-slate-900/90 rounded-xl p-3.5 border transition-all duration-200 cursor-pointer shadow-md hover:shadow-xl hover:-translate-y-0.5 ${
        isAtrasado
          ? 'border-rose-500/60 shadow-rose-950/30 hover:border-rose-400'
          : isAtencao
          ? 'border-amber-500/50 shadow-amber-950/20 hover:border-amber-400'
          : 'border-slate-800 hover:border-slate-700 hover:bg-slate-850'
      }`}
    >
      {/* Topo do Card: Número da OS e Placa */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <span className="font-mono text-xs font-bold text-slate-400 tracking-wider">
          #{String(ordem.id).padStart(5, '0')}
        </span>
        <PlacaBadge placa={ordem.placa} mercosul={ordem.mercosul} size="sm" />
      </div>

      {/* Modelo do Veículo */}
      <h4 className="text-sm font-semibold text-slate-100 line-clamp-1 mb-2">
        {ordem.modelo}
      </h4>

      {/* Tags: Origem & Tipo de Serviço */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {ordem.origemNome && (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700/60">
            <Building2 className="w-3 h-3 text-slate-400" />
            <span className="truncate max-w-[110px]">{ordem.origemNome}</span>
          </span>
        )}
        {ordem.tipoServicoNome && (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-300 bg-sky-950/50 px-2 py-0.5 rounded border border-sky-800/40">
            <Wrench className="w-3 h-3 text-sky-400" />
            <span>{ordem.tipoServicoNome}</span>
          </span>
        )}
      </div>

      {/* Linha de SLA / Dias no Pátio */}
      <div className="flex items-center justify-between text-xs mb-3 pt-2 border-t border-slate-800/80">
        <div
          className={`flex items-center gap-1 font-medium ${
            isAtrasado
              ? 'text-rose-400'
              : isAtencao
              ? 'text-amber-400'
              : 'text-emerald-400'
          }`}
          title={`Status SLA: ${ordem.statusSla} (${ordem.diasNoPatio} dias no pátio)`}
        >
          {isAtrasado ? (
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          ) : (
            <Clock className="w-3.5 h-3.5 shrink-0" />
          )}
          <span>
            {ordem.diasNoPatio} {ordem.diasNoPatio === 1 ? 'dia' : 'dias'} no pátio
          </span>
        </div>

        {/* Faturamento status */}
        {ordem.faturado ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-300 bg-emerald-950/80 border border-emerald-500/30 px-1.5 py-0.5 rounded">
            <CheckCircle2 className="w-2.5 h-2.5" />
            Faturado
          </span>
        ) : (
          <span className="text-[10px] text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded">
            A faturar
          </span>
        )}
      </div>

      {/* Rodapé do Card: Valor Orçado e Ação Rápida */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-1 text-slate-200 font-mono text-xs font-bold">
          <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
          <span>{formatarMoeda(ordem.valorOrcamento)}</span>
        </div>

        {etapaSeguinte && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAvancarEtapa(ordem);
            }}
            title="Avançar para a próxima etapa"
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold bg-slate-800 hover:bg-sky-600 text-slate-300 hover:text-white border border-slate-700 hover:border-sky-500 transition-all cursor-pointer opacity-80 group-hover:opacity-100"
          >
            <span>Avançar</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
};
