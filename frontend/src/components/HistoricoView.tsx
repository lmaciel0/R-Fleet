import React, { useEffect, useState } from 'react';
import { History, FileSpreadsheet, FileText } from 'lucide-react';
import { HistoricoMes, OrdemServico } from '../types';
import { api } from '../services/api';
import { PlacaBadge } from './PlacaBadge';
import { intervaloDoMes, rotuloMesCurto, rotuloMesLongo } from '../utils/meses';

interface HistoricoViewProps {
  /** Muda quando alguma OS é alterada fora daqui; dispara uma nova busca. */
  versaoDados: number;
  onSelecionarOrdem: (ordem: OrdemServico) => void;
  onErro: (mensagem: string) => void;
}

const mesmoMes = (a: HistoricoMes | null, b: HistoricoMes) =>
  a !== null && a.ano === b.ano && a.mes === b.mes;

export const HistoricoView: React.FC<HistoricoViewProps> = ({ versaoDados, onSelecionarOrdem, onErro }) => {
  const [meses, setMeses] = useState<HistoricoMes[] | null>(null);
  const [mesSelecionado, setMesSelecionado] = useState<HistoricoMes | null>(null);
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [carregandoOrdens, setCarregandoOrdens] = useState(false);

  // Meses disponíveis (o mais recente vem primeiro e já fica selecionado). Numa nova busca,
  // mantém o mês escolhido se ele ainda existir; o objeto novo faz a tabela do mês recarregar.
  useEffect(() => {
    let cancelado = false;
    api
      .listarMesesHistorico()
      .then((res) => {
        if (cancelado) return;
        setMeses(res);
        setMesSelecionado((atual) => res.find((m) => mesmoMes(atual, m)) ?? res[0] ?? null);
      })
      .catch((err: any) => {
        if (cancelado) return;
        setMeses([]);
        onErro(err.message || 'Falha ao carregar o histórico.');
      });
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versaoDados]);

  // Veículos entregues no mês selecionado. O flag `cancelado` descarta respostas
  // atrasadas quando o usuário troca de mês rapidamente.
  useEffect(() => {
    if (!mesSelecionado) {
      setOrdens([]);
      return;
    }
    let cancelado = false;
    const { inicio, fim } = intervaloDoMes(mesSelecionado.ano, mesSelecionado.mes);
    setCarregandoOrdens(true);
    api
      .listarOrdens({ etapas: ['ENTREGUE'], dataSaidaInicio: inicio, dataSaidaFim: fim })
      .then((res) => {
        if (cancelado) return;
        setOrdens([...res].sort((a, b) => (b.dataSaida ?? '').localeCompare(a.dataSaida ?? '')));
      })
      .catch((err: any) => {
        if (!cancelado) onErro(err.message || 'Falha ao carregar os veículos do mês.');
      })
      .finally(() => {
        if (!cancelado) setCarregandoOrdens(false);
      });
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mesSelecionado]);

  const exportar = (formato: 'xlsx' | 'csv') => {
    if (!mesSelecionado) return;
    const { inicio, fim } = intervaloDoMes(mesSelecionado.ano, mesSelecionado.mes);
    const url = api.exportarOrdensUrl(formato, {
      etapas: ['ENTREGUE'],
      dataSaidaInicio: inicio,
      dataSaidaFim: fim,
    });
    window.open(url, '_blank');
  };

  const formatarMoeda = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  const formatarData = (dataStr?: string) => {
    if (!dataStr) return '-';
    const [ano, mes, dia] = dataStr.split('-');
    return `${dia}/${mes}/${ano}`;
  };

  if (meses === null) {
    return (
      <div className="py-20 text-center text-slate-400">
        <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm">Carregando histórico...</p>
      </div>
    );
  }

  if (meses.length === 0) {
    return (
      <div className="py-20 text-center text-slate-400">
        <History className="w-10 h-10 mx-auto mb-3 text-slate-600" />
        <p className="text-sm">Nenhum veículo entregue ainda.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Seletor de meses */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {meses.map((m) => (
          <button
            key={`${m.ano}-${m.mes}`}
            onClick={() => setMesSelecionado(m)}
            className={`shrink-0 flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              mesmoMes(mesSelecionado, m)
                ? 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <span>{rotuloMesCurto(m.ano, m.mes)}</span>
            <span className="font-mono text-[11px] px-1.5 rounded bg-slate-950/60">{m.quantidade}</span>
          </button>
        ))}
      </div>

      {/* Tabela do mês */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4">Placa</th>
                <th className="py-3.5 px-4">Veículo / Modelo</th>
                <th className="py-3.5 px-4">Origem</th>
                <th className="py-3.5 px-4">Serviço</th>
                <th className="py-3.5 px-4">Entrada</th>
                <th className="py-3.5 px-4">Saída</th>
                <th className="py-3.5 px-4 text-center">Dias</th>
                <th className="py-3.5 px-4 text-right">Valor</th>
                <th className="py-3.5 px-4 text-center">Faturado</th>
                <th className="py-3.5 px-4">NF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {carregandoOrdens ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    Carregando veículos do mês...
                  </td>
                </tr>
              ) : (
                ordens.map((ordem) => (
                  <tr
                    key={ordem.id}
                    onClick={() => onSelecionarOrdem(ordem)}
                    className="hover:bg-slate-800/60 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4">
                      <PlacaBadge placa={ordem.placa} mercosul={ordem.mercosul} size="sm" />
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-100 max-w-[200px] truncate">{ordem.modelo}</td>
                    <td className="py-3 px-4 text-slate-300">{ordem.origemNome || '-'}</td>
                    <td className="py-3 px-4 text-sky-400 font-medium">{ordem.tipoServicoNome || '-'}</td>
                    <td className="py-3 px-4 text-slate-400 font-mono">{formatarData(ordem.dataEntrada)}</td>
                    <td className="py-3 px-4 text-slate-400 font-mono">{formatarData(ordem.dataSaida)}</td>
                    <td className="py-3 px-4 text-center font-mono text-slate-300">{ordem.diasNoPatio}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-100">
                      {formatarMoeda(ordem.valorOrcamento)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={ordem.faturado ? 'text-emerald-400 font-semibold' : 'text-slate-500'}>
                        {ordem.faturado ? 'Sim' : 'Não'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono">{ordem.numeroNf || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Rodapé com totais e exportação */}
        {mesSelecionado && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-t border-slate-800 bg-slate-950/60">
            <span className="text-xs text-slate-300">
              <strong className="text-slate-100">{rotuloMesLongo(mesSelecionado.ano, mesSelecionado.mes)}</strong>
              {' — '}
              {mesSelecionado.quantidade} {mesSelecionado.quantidade === 1 ? 'veículo' : 'veículos'}
              {' — '}
              <strong className="font-mono text-slate-100">{formatarMoeda(mesSelecionado.valorTotal)}</strong>
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => exportar('xlsx')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>Exportar Excel</span>
              </button>
              <button
                onClick={() => exportar('csv')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all cursor-pointer"
              >
                <FileText className="w-4 h-4 text-sky-400" />
                <span>Exportar CSV</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
