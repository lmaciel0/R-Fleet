import React, { useEffect, useState } from 'react';
import { Archive } from 'lucide-react';
import { OrdemServico } from '../types';
import { api } from '../services/api';
import { PlacaBadge } from './PlacaBadge';

interface ArquivadasViewProps {
  /** Muda quando alguma OS é alterada (ex.: arquivada ou restaurada); dispara uma nova busca. */
  versaoDados: number;
  onSelecionarOrdem: (ordem: OrdemServico) => void;
  onErro: (mensagem: string) => void;
}

/**
 * OS arquivadas, de qualquer etapa. Clicar abre o modal, onde está o motivo (Linha do Tempo)
 * e os botões de restaurar e de excluir de vez.
 */
export const ArquivadasView: React.FC<ArquivadasViewProps> = ({ versaoDados, onSelecionarOrdem, onErro }) => {
  const [ordens, setOrdens] = useState<OrdemServico[] | null>(null);

  useEffect(() => {
    let cancelado = false;
    api
      .listarOrdens({ ativo: false })
      .then((res) => {
        if (!cancelado) setOrdens(res);
      })
      .catch((err: any) => {
        if (cancelado) return;
        setOrdens([]);
        onErro(err.message || 'Falha ao carregar as OS arquivadas.');
      });
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versaoDados]);

  const formatarMoeda = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  const formatarData = (dataStr?: string) => {
    if (!dataStr) return '-';
    const [ano, mes, dia] = dataStr.split('-');
    return `${dia}/${mes}/${ano}`;
  };

  if (ordens === null) {
    return (
      <div className="py-20 text-center text-slate-400">
        <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm">Carregando OS arquivadas...</p>
      </div>
    );
  }

  if (ordens.length === 0) {
    return (
      <div className="py-20 text-center text-slate-400">
        <Archive className="w-10 h-10 mx-auto mb-3 text-slate-600" />
        <p className="text-sm">Nenhuma OS arquivada.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 font-semibold uppercase tracking-wider">
              <th className="py-3.5 px-4">Placa</th>
              <th className="py-3.5 px-4">Veículo / Modelo</th>
              <th className="py-3.5 px-4">Origem</th>
              <th className="py-3.5 px-4">Etapa</th>
              <th className="py-3.5 px-4">Entrada</th>
              <th className="py-3.5 px-4 text-right">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {ordens.map((ordem) => (
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
                <td className="py-3 px-4 text-slate-300">{ordem.etapaDescricao}</td>
                <td className="py-3 px-4 text-slate-400 font-mono">{formatarData(ordem.dataEntrada)}</td>
                <td className="py-3 px-4 text-right font-mono font-bold text-slate-100">
                  {formatarMoeda(ordem.valorOrcamento)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-3 border-t border-slate-800 bg-slate-950/60 text-xs text-slate-400">
        {ordens.length} {ordens.length === 1 ? 'OS arquivada' : 'OS arquivadas'}. Clique numa linha para ver o
        motivo, restaurar ou excluir de vez.
      </div>
    </div>
  );
};
