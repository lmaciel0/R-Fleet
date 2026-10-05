import React, { useEffect, useState } from 'react';
import { History, FileSpreadsheet, FileText, Archive } from 'lucide-react';
import { HistoricoMes, OrdemServico } from '../types';
import { api } from '../services/api';
import { PlacaBadge } from './PlacaBadge';
import { ativarComTeclado } from '../utils/acessibilidade';
import { ArquivadasView } from './ArquivadasView';
import { CardFaturamentoMes } from './CardFaturamentoMes';
import { intervaloDoMes, rotuloMesCurto, rotuloMesLongo } from '../utils/meses';

interface HistoricoViewProps {
  /** Muda quando alguma OS é alterada fora daqui; dispara uma nova busca. */
  versaoDados: number;
  onSelecionarOrdem: (ordem: OrdemServico) => void;
  onErro: (mensagem: string) => void;
}

const mesmoMes = (a: HistoricoMes | null, b: HistoricoMes) =>
  a !== null && a.ano === b.ano && a.mes === b.mes;

/** Veículos entregues, agrupados pelo mês de saída. */
const EntreguesPorMes: React.FC<HistoricoViewProps> = ({ versaoDados, onSelecionarOrdem, onErro }) => {
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
    let intervalo: { inicio: string; fim: string };
    try {
      intervalo = intervaloDoMes(mesSelecionado.ano, mesSelecionado.mes);
    } catch (err: any) {
      setOrdens([]);
      onErro(err.message);
      return;
    }
    const { inicio, fim } = intervalo;
    let cancelado = false;
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
    let intervalo: { inicio: string; fim: string };
    try {
      intervalo = intervaloDoMes(mesSelecionado.ano, mesSelecionado.mes);
    } catch (err: any) {
      onErro(err.message);
      return;
    }
    const { inicio, fim } = intervalo;
    api
      .exportarOrdens(formato, {
        etapas: ['ENTREGUE'],
        dataSaidaInicio: inicio,
        dataSaidaFim: fim,
      })
      .catch((err: any) => onErro(err.message || 'Falha ao exportar.'));
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
      <div className="py-20 text-center text-aco">
        <div className="w-8 h-8 border-2 border-mercosul border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm">Carregando histórico...</p>
      </div>
    );
  }

  if (meses.length === 0) {
    return (
      <div className="py-20 text-center text-aco">
        <History className="w-10 h-10 mx-auto mb-3 text-trilho" />
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
            aria-pressed={mesmoMes(mesSelecionado, m)}
            className={`shrink-0 flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              mesmoMes(mesSelecionado, m)
                ? 'bg-mercosul/10 text-mercosul border-mercosul/40'
                : 'bg-etiqueta text-aco border-trilho hover:text-grafite'
            }`}
          >
            <span>{rotuloMesCurto(m.ano, m.mes)}</span>
            <span className="font-placa tabular-nums text-[11px] px-1.5 rounded bg-parede/60">{m.quantidade}</span>
          </button>
        ))}
      </div>

      {mesSelecionado && <CardFaturamentoMes mes={mesSelecionado} onErro={onErro} />}

      {/* Tabela do mês */}
      <div className="bg-etiqueta border border-trilho rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-trilho bg-parede/60 text-aco font-semibold uppercase tracking-wider">
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
            <tbody className="divide-y divide-trilho">
              {carregandoOrdens ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-aco">
                    Carregando veículos do mês...
                  </td>
                </tr>
              ) : (
                ordens.map((ordem) => (
                  <tr
                    key={ordem.id}
                    onClick={() => onSelecionarOrdem(ordem)}
                    onKeyDown={ativarComTeclado(() => onSelecionarOrdem(ordem))}
                    tabIndex={0}
                    className="hover:bg-parede focus-visible:-outline-offset-2 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4">
                      <PlacaBadge placa={ordem.placa} mercosul={ordem.mercosul} size="sm" />
                    </td>
                    <td className="py-3 px-4 font-medium text-grafite max-w-[200px] truncate">{ordem.modelo}</td>
                    <td className="py-3 px-4 text-grafite">{ordem.origemNome || '-'}</td>
                    <td className="py-3 px-4 text-mercosul font-medium">{ordem.tipoServicoNome || '-'}</td>
                    <td className="py-3 px-4 text-aco font-placa tabular-nums">{formatarData(ordem.dataEntrada)}</td>
                    <td className="py-3 px-4 text-aco font-placa tabular-nums">{formatarData(ordem.dataSaida)}</td>
                    <td className="py-3 px-4 text-center font-placa tabular-nums text-grafite">{ordem.diasNoPatio}</td>
                    <td className="py-3 px-4 text-right font-placa tabular-nums font-bold text-grafite">
                      {formatarMoeda(ordem.valorOrcamento)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={ordem.faturado ? 'text-verde font-semibold' : 'text-aco'}>
                        {ordem.faturado ? 'Sim' : 'Não'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-aco font-placa tabular-nums">{ordem.numeroNf || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Rodapé com totais e exportação */}
        {mesSelecionado && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-t border-trilho bg-parede/60">
            <span className="text-xs text-grafite">
              <strong className="text-grafite">{rotuloMesLongo(mesSelecionado.ano, mesSelecionado.mes)}</strong>
              {' — '}
              {mesSelecionado.quantidade} {mesSelecionado.quantidade === 1 ? 'veículo' : 'veículos'}
              {' — '}
              <strong className="font-placa tabular-nums text-grafite">{formatarMoeda(mesSelecionado.valorTotal)}</strong>
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => exportar('xlsx')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-trilho bg-parede hover:bg-trilho/50 text-grafite text-xs font-semibold transition-all cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-verde" />
                <span>Exportar Excel</span>
              </button>
              <button
                onClick={() => exportar('csv')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-trilho bg-parede hover:bg-trilho/50 text-grafite text-xs font-semibold transition-all cursor-pointer"
              >
                <FileText className="w-4 h-4 text-mercosul" />
                <span>Exportar CSV</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const HistoricoView: React.FC<HistoricoViewProps> = (props) => {
  const [visao, setVisao] = useState<'entregues' | 'arquivadas'>('entregues');

  const classeBotao = (ativo: boolean) =>
    `flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
      ativo
        ? 'bg-mercosul/10 text-mercosul border-mercosul/40'
        : 'bg-etiqueta text-aco border-trilho hover:text-grafite'
    }`;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={() => setVisao('entregues')}
          aria-pressed={visao === 'entregues'}
          className={classeBotao(visao === 'entregues')}
        >
          <History className="w-4 h-4" />
          <span>Entregues</span>
        </button>
        <button
          onClick={() => setVisao('arquivadas')}
          aria-pressed={visao === 'arquivadas'}
          className={classeBotao(visao === 'arquivadas')}
        >
          <Archive className="w-4 h-4" />
          <span>Arquivadas</span>
        </button>
      </div>

      {visao === 'entregues' ? <EntreguesPorMes {...props} /> : <ArquivadasView {...props} />}
    </div>
  );
};
