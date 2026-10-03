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

interface DashboardViewProps {
  metricas: DashboardMetricas | null;
  onFiltrarEtapa?: (etapa: EtapaOrdemServico) => void;
}

const ETAPAS_LABELS: Record<EtapaOrdemServico, string> = {
  AGUARDANDO_ORCAMENTO: 'Aguardando Orçamento',
  ORCAMENTO: 'Orçamento',
  APROVADO: 'Aprovado',
  EM_SERVICO: 'Em Serviço',
  FINALIZADO: 'Finalizado',
  AGUARDANDO_RETIRADA: 'Aguardando Retirada',
  ENTREGUE: 'Entregue',
};

const ETAPAS_CORES: Record<EtapaOrdemServico, string> = {
  AGUARDANDO_ORCAMENTO: 'bg-slate-500 text-slate-300 border-slate-500/30',
  ORCAMENTO: 'bg-blue-500 text-blue-300 border-blue-500/30',
  APROVADO: 'bg-teal-500 text-teal-300 border-teal-500/30',
  EM_SERVICO: 'bg-amber-500 text-amber-300 border-amber-500/30',
  FINALIZADO: 'bg-purple-500 text-purple-300 border-purple-500/30',
  AGUARDANDO_RETIRADA: 'bg-emerald-500 text-emerald-300 border-emerald-500/30',
  ENTREGUE: 'bg-zinc-600 text-zinc-300 border-zinc-600/30',
};

export const DashboardView: React.FC<DashboardViewProps> = ({ metricas }) => {
  if (!metricas) {
    return (
      <div className="py-20 text-center text-slate-400">
        <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
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
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Veículos no Pátio</span>
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <Car className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-100 font-mono">
            {metricas.totalVeiculosPatio}
          </div>
          <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
            <span>Ativos nas etapas da oficina</span>
          </div>
        </div>

        {/* 2. Em Atraso SLA */}
        <div
          className={`bg-slate-900/90 border rounded-2xl p-4 shadow-xl ${
            emAtraso > 0 ? 'border-rose-500/50 shadow-rose-950/20' : 'border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Em Atraso SLA</span>
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                emAtraso > 0
                  ? 'bg-rose-500/20 border border-rose-500/40 text-rose-400 animate-pulse'
                  : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div
            className={`text-3xl font-extrabold font-mono ${
              emAtraso > 0 ? 'text-rose-400' : 'text-slate-100'
            }`}
          >
            {metricas.veiculosEmAtraso}
          </div>
          <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
            <span>{percAtraso}% do pátio &gt; {metricas.limiteSlaDias} dias</span>
          </div>
        </div>

        {/* 3. Comissão Mensal */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Comissão Mensal</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <HandCoins className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-amber-400 font-mono truncate">
            {formatarMoeda(metricas.comissaoMesAtual)}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            <span>
              {formatarPercentual(metricas.comissaoPercentual)} de{' '}
              {formatarMoeda(metricas.faturamentoMesAtual)} faturado em {nomeMesAtual()}
            </span>
          </div>
        </div>

        {/* 4. Faturamento Mês Atual */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Faturado no Mês</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-emerald-400 font-mono truncate">
            {formatarMoeda(metricas.faturamentoMesAtual)}
          </div>
          <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-emerald-400" />
            <span>Mês de referência</span>
          </div>
        </div>

        {/* 5. Total Orçado no Pátio */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Orçado em Pátio</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-indigo-300 font-mono truncate">
            {formatarMoeda(metricas.totalOrcadoPatio)}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            <span>Potencial em produção</span>
          </div>
        </div>
      </div>

      {/* Seção 2: Distribuição por Etapas do Fluxo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Distribuição por Etapas */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-bold text-slate-100">Distribuição do Fluxo por Etapas</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Quantidade de veículos em cada estágio operacional da oficina
              </p>
            </div>
            <span className="text-xs text-slate-400 font-mono bg-slate-800 px-2.5 py-1 rounded-lg">
              7 Estágios Ativos
            </span>
          </div>

          <div className="space-y-3.5">
            {Object.entries(ETAPAS_LABELS).map(([etapaKey, label]) => {
              const etapa = etapaKey as EtapaOrdemServico;
              const count = metricas.distribuicaoPorEtapa[etapa] || 0;
              const perc = totalPatio > 0 && etapa !== 'ENTREGUE'
                ? Math.round((count / totalPatio) * 100)
                : 0;

              return (
                <div key={etapa} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-300 flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${ETAPAS_CORES[etapa].split(' ')[0]}`} />
                      {label}
                    </span>
                    <span className="font-mono text-slate-200">
                      {count} <span className="text-slate-400 font-normal">({perc}%)</span>
                    </span>
                  </div>
                  {/* Barra de progresso */}
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${ETAPAS_CORES[etapa].split(' ')[0]}`}
                      style={{ width: `${Math.min(perc, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Distribuição por Locadora / Origem & Faturamento */}
        <div className="space-y-6">
          {/* Origem */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="w-4 h-4 text-sky-400" />
              <h3 className="text-base font-bold text-slate-100">Veículos por Locadora / Origem</h3>
            </div>

            <div className="space-y-3">
              {Object.keys(metricas.distribuicaoPorOrigem).length === 0 ? (
                <p className="text-xs text-slate-400">Nenhum dado de origem registrado.</p>
              ) : (
                Object.entries(metricas.distribuicaoPorOrigem)
                  .sort(([, a], [, b]) => b - a)
                  .map(([origemNome, count]) => {
                    const perc = totalPatio > 0 ? Math.round((count / totalPatio) * 100) : 0;
                    return (
                      <div key={origemNome} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-slate-300 truncate max-w-[170px]">
                            {origemNome}
                          </span>
                          <span className="font-mono font-bold text-slate-200">
                            {count} <span className="text-slate-400 font-normal">({perc}%)</span>
                          </span>
                        </div>
                        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-sky-500 h-full rounded-full"
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
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <h3 className="text-base font-bold text-slate-100">Status de Faturamento</h3>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-center">
                <span className="text-[11px] text-slate-400 uppercase font-semibold">Faturadas</span>
                <p className="text-xl font-mono font-bold text-emerald-400 mt-0.5">
                  {metricas.totalFaturadas}
                </p>
              </div>
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-center">
                <span className="text-[11px] text-slate-400 uppercase font-semibold">A Faturar</span>
                <p className="text-xl font-mono font-bold text-amber-400 mt-0.5">
                  {metricas.totalNaoFaturadas}
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400">Total Faturado Histórico</span>
              <span className="font-mono font-bold text-emerald-400">
                {formatarMoeda(metricas.totalFaturadoGeral)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
