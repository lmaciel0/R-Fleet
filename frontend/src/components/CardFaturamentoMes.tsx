import React, { useEffect, useState } from 'react';
import { DollarSign, HandCoins } from 'lucide-react';
import { FaturamentoMes, HistoricoMes } from '../types';
import { api } from '../services/api';
import { rotuloMesLongo } from '../utils/meses';

interface CardFaturamentoMesProps {
  mes: HistoricoMes;
  onErro: (mensagem: string) => void;
}

const formatarMoeda = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

/**
 * Faturado no mês escolhido no Histórico. O mês vale pela data de faturamento da OS,
 * não pela de saída que agrupa a tabela: um carro entregue em setembro e faturado em outubro conta em outubro.
 */
export const CardFaturamentoMes: React.FC<CardFaturamentoMesProps> = ({ mes, onErro }) => {
  const [faturamento, setFaturamento] = useState<FaturamentoMes | null>(null);

  // O flag `cancelado` descarta respostas atrasadas quando o usuário troca de mês rapidamente.
  useEffect(() => {
    let cancelado = false;
    setFaturamento(null);
    api
      .obterFaturamentoMes(mes.ano, mes.mes)
      .then((res) => {
        if (!cancelado) setFaturamento(res);
      })
      .catch((err: any) => {
        if (!cancelado) onErro(err.message || 'Falha ao carregar o faturamento do mês.');
      });
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mes]);

  const rotulo = rotuloMesLongo(mes.ano, mes.mes);

  const percentual = (valor: number) => `${valor.toLocaleString('pt-BR')}%`;

  const cartaoComissao = (
    titulo: string,
    comissao: number | undefined,
    percentualParte: number | undefined,
    base: number | undefined,
    parte: string
  ) => (
    <div className="bg-etiqueta border border-trilho rounded-2xl p-4">
      <div className="flex items-center justify-between text-aco mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider">
          {titulo} de {rotulo}
        </span>
        <div className="w-8 h-8 rounded-xl bg-amarelo/15 border border-amarelo/60 flex items-center justify-center text-amarelo-tinta">
          <HandCoins className="w-4 h-4" />
        </div>
      </div>
      <div className="text-2xl font-extrabold text-amarelo-tinta font-placa tabular-nums truncate">
        {faturamento ? formatarMoeda(comissao ?? 0) : '—'}
      </div>
      <div className="text-xs text-aco mt-1">
        {faturamento ? (
          <span>
            {percentual(percentualParte ?? 0)} de {formatarMoeda(base ?? 0)} em {parte}
          </span>
        ) : (
          <span>Calculando...</span>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-4" aria-live="polite" aria-busy={faturamento === null}>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-etiqueta border border-trilho rounded-2xl p-4">
          <div className="flex items-center justify-between text-aco mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Faturado em {rotulo}</span>
            <div className="w-8 h-8 rounded-xl bg-verde/10 border border-verde/40 flex items-center justify-center text-verde">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-verde font-placa tabular-nums truncate">
            {faturamento ? formatarMoeda(faturamento.total) : '—'}
          </div>
          <div className="text-xs text-aco mt-1">
            {faturamento ? (
              <span>
                {faturamento.quantidade} {faturamento.quantidade === 1 ? 'OS faturada' : 'OS faturadas'} no mês
                {' · '}Total geral{' '}
                <strong className="font-placa tabular-nums text-grafite">{formatarMoeda(faturamento.totalGeral)}</strong>
              </span>
            ) : (
              <span>Calculando...</span>
            )}
          </div>
        </div>

        {cartaoComissao(
          'Comissão de mão de obra',
          faturamento?.comissaoMaoDeObra,
          faturamento?.percentualMaoDeObra,
          faturamento?.totalMaoDeObra,
          'mão de obra'
        )}
        {cartaoComissao(
          'Comissão de peças',
          faturamento?.comissaoPecas,
          faturamento?.percentualPecas,
          faturamento?.totalPecas,
          'peças'
        )}
      </div>

      {faturamento && (
        <p className="text-xs text-aco">
          Comissão total de {rotulo}:{' '}
          <strong className="font-placa tabular-nums text-amarelo-tinta">{formatarMoeda(faturamento.comissao)}</strong>
        </p>
      )}
    </div>
  );
};
