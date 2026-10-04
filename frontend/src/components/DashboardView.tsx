import React from 'react';
import { DashboardMetricas, EtapaOrdemServico } from '../types';
import {
  Car,
  AlertTriangle,
  HandCoins,
  DollarSign,
  TrendingUp,
  Building2,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import { nomeMesAtual } from '../utils/meses';
import { ETAPAS } from '../utils/etapas';

interface DashboardViewProps {
  metricas: DashboardMetricas | null;
  onFiltrarEtapa?: (etapa: EtapaOrdemServico) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ metricas, onFiltrarEtapa }) => {
  if (!metricas) {
    return (
      <div className="py-20 text-center text-aco">
        <div className="w-8 h-8 border-2 border-mercosul border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm">Carregando indicadores do painel executivo...</p>
      </div>
    );
  }

  const formatarMoeda = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val || 0);
  };

  const formatarPercentual = (val: number) => `${(val ?? 0).toLocaleString('pt-BR')}%`;

  const totalPatio = metricas.totalVeiculosPatio;
  const emAtraso = metricas.veiculosEmAtraso;
  const percAtraso = totalPatio > 0 ? Math.round((emAtraso / totalPatio) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Grade de KPIs Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* 1. Total no Pátio */}
        <div className="bg-etiqueta border border-trilho rounded-2xl p-4">
          <div className="flex items-center justify-between text-aco mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Veículos no Pátio</span>
            <div className="w-8 h-8 rounded-xl bg-mercosul/10 border border-mercosul/40 flex items-center justify-center text-mercosul">
              <Car className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-grafite font-placa tabular-nums">
            {metricas.totalVeiculosPatio}
          </div>
          <div className="text-xs text-aco mt-1 flex items-center gap-1">
            <span>Ativos nas etapas da oficina</span>
          </div>
        </div>

        {/* 2. Parados além do limite */}
        <div
          className={`bg-etiqueta border rounded-2xl p-4  ${
            emAtraso > 0 ? 'border-vermelho/40 ' : 'border-trilho'
          }`}
        >
          <div className="flex items-center justify-between text-aco mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Parados</span>
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                emAtraso > 0
                  ? 'bg-vermelho/10 border border-vermelho/40 text-vermelho animate-pulse'
                  : 'bg-verde/10 border border-verde/40 text-verde'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div
            className={`text-3xl font-extrabold font-placa tabular-nums ${
              emAtraso > 0 ? 'text-vermelho' : 'text-grafite'
            }`}
          >
            {metricas.veiculosEmAtraso}
          </div>
          <div className="text-xs text-aco mt-1 flex items-center gap-1">
            <span>{percAtraso}% do pátio &gt; {metricas.limiteSlaDias} dias</span>
          </div>
        </div>

        {/* 3. Comissão Mensal */}
        <div className="bg-etiqueta border border-trilho rounded-2xl p-4">
          <div className="flex items-center justify-between text-aco mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Comissão Mensal</span>
            <div className="w-8 h-8 rounded-xl bg-amarelo/15 border border-amarelo/60 flex items-center justify-center text-amarelo-tinta">
              <HandCoins className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-amarelo-tinta font-placa tabular-nums truncate">
            {formatarMoeda(metricas.comissaoMesAtual)}
          </div>
          <div className="text-xs text-aco mt-1">
            <span>
              {formatarPercentual(metricas.comissaoPercentual)} de{' '}
              {formatarMoeda(metricas.faturamentoMesAtual)} faturado em {nomeMesAtual()}
            </span>
          </div>
        </div>

        {/* 4. Faturamento Mês Atual */}
        <div className="bg-etiqueta border border-trilho rounded-2xl p-4">
          <div className="flex items-center justify-between text-aco mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Faturado no Mês</span>
            <div className="w-8 h-8 rounded-xl bg-verde/10 border border-verde/40 flex items-center justify-center text-verde">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-verde font-placa tabular-nums truncate">
            {formatarMoeda(metricas.faturamentoMesAtual)}
          </div>
          <div className="text-xs text-aco mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-verde" />
            <span>Mês de referência</span>
          </div>
        </div>

        {/* 5. Total Orçado no Pátio */}
        <div className="bg-etiqueta border border-trilho rounded-2xl p-4">
          <div className="flex items-center justify-between text-aco mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Orçado em Pátio</span>
            <div className="w-8 h-8 rounded-xl bg-mercosul/10 border border-mercosul/40 flex items-center justify-center text-mercosul">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-mercosul font-placa tabular-nums truncate">
            {formatarMoeda(metricas.totalOrcadoPatio)}
          </div>
          <div className="text-xs text-aco mt-1">
            <span>Potencial em produção</span>
          </div>
        </div>
      </div>

      {/* Seção 2: Distribuição por Etapas do Fluxo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Distribuição por Etapas */}
        <div className="lg:col-span-2 bg-etiqueta border border-trilho rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-bold text-grafite">Distribuição do Fluxo por Etapas</h3>
              <p className="text-xs text-aco mt-0.5">
                Carros do pátio em cada etapa. Clique numa etapa para ver os carros na tabela.
              </p>
            </div>
          </div>

          <ul className="-mx-2 space-y-0.5">
            {/* Entregue fica fora das barras: não está no pátio, e a contagem é só do mês */}
            {ETAPAS.filter(({ etapa }) => etapa !== 'ENTREGUE').map(({ etapa, titulo: label, fundo }) => {
              const count = metricas.distribuicaoPorEtapa[etapa] || 0;
              const perc = totalPatio > 0 ? Math.round((count / totalPatio) * 100) : 0;

              return (
                <li key={etapa}>
                  <button
                    type="button"
                    onClick={() => onFiltrarEtapa?.(etapa)}
                    title={`Ver ${label.toLowerCase()} na tabela`}
                    className="w-full px-2 py-1.5 space-y-1 rounded-lg text-left hover:bg-parede/70 cursor-pointer transition-colors"
                  >
                    <span className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-grafite">{label}</span>
                      <span className="font-placa tabular-nums text-grafite">
                        {count} <span className="text-aco font-normal">({perc}%)</span>
                      </span>
                    </span>
                    {/* Barra de progresso */}
                    <span aria-hidden="true" className="block w-full bg-parede h-2 rounded-full overflow-hidden">
                      <span
                        className={`block h-full rounded-full transition-all duration-500 ${fundo}`}
                        style={{ width: `${Math.min(perc, 100)}%` }}
                      />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <button
            type="button"
            onClick={() => onFiltrarEtapa?.('ENTREGUE')}
            title="Ver os entregues do mês na tabela"
            className="mt-4 -mx-2 w-[calc(100%+1rem)] px-2 pt-3 pb-1.5 flex items-center justify-between border-t border-trilho text-xs rounded-b-lg text-left hover:bg-parede/70 cursor-pointer transition-colors"
          >
            <span className="flex items-center gap-2 font-semibold text-grafite">
              <CheckCircle2 className="w-4 h-4 text-etapa-entregue" aria-hidden="true" />
              Entregues em {nomeMesAtual()}
            </span>
            <span className="font-placa tabular-nums text-[15px] font-semibold text-grafite">
              {metricas.distribuicaoPorEtapa.ENTREGUE || 0}
            </span>
          </button>
        </div>

        {/* Distribuição por Locadora / Origem & Faturamento */}
        <div className="space-y-6">
          {/* Origem */}
          <div className="bg-etiqueta border border-trilho rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="w-4 h-4 text-mercosul" />
              <h3 className="text-base font-bold text-grafite">Veículos por Locadora / Origem</h3>
            </div>

            <div className="space-y-3">
              {Object.keys(metricas.distribuicaoPorOrigem).length === 0 ? (
                <p className="text-xs text-aco">Nenhum dado de origem registrado.</p>
              ) : (
                Object.entries(metricas.distribuicaoPorOrigem)
                  .sort(([, a], [, b]) => b - a)
                  .map(([origemNome, count]) => {
                    const perc = totalPatio > 0 ? Math.round((count / totalPatio) * 100) : 0;
                    return (
                      <div key={origemNome} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-grafite truncate max-w-[170px]">
                            {origemNome}
                          </span>
                          <span className="font-placa tabular-nums font-bold text-grafite">
                            {count} <span className="text-aco font-normal">({perc}%)</span>
                          </span>
                        </div>
                        <div className="w-full bg-parede h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-mercosul h-full rounded-full"
                            style={{ width: `${perc}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>

          {/* Faturamento Geral */}
          <div className="bg-etiqueta border border-trilho rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="w-4 h-4 text-verde" />
              <h3 className="text-base font-bold text-grafite">Status de Faturamento</h3>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-parede/60 p-3 rounded-xl border border-trilho text-center">
                <span className="text-[11px] text-aco uppercase font-semibold">Faturadas</span>
                <p className="text-xl font-placa tabular-nums font-bold text-verde mt-0.5">
                  {metricas.totalFaturadas}
                </p>
              </div>
              <div className="bg-parede/60 p-3 rounded-xl border border-trilho text-center">
                <span className="text-[11px] text-aco uppercase font-semibold">A Faturar</span>
                <p className="text-xl font-placa tabular-nums font-bold text-amarelo-tinta mt-0.5">
                  {metricas.totalNaoFaturadas}
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-trilho flex items-center justify-between text-xs">
              <span className="text-aco">Total Faturado Histórico</span>
              <span className="font-placa tabular-nums font-bold text-verde">
                {formatarMoeda(metricas.totalFaturadoGeral)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
