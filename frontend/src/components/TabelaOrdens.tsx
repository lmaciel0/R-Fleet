import React, { useState } from 'react';
import { OrdemServico, EtapaOrdemServico, Origem, TipoServico } from '../types';
import { PlacaBadge } from './PlacaBadge';
import { ativarComTeclado } from '../utils/acessibilidade';
import {
  Search,
  Download,
  AlertTriangle,
  ExternalLink,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../services/api';

interface TabelaOrdensProps {
  ordens: OrdemServico[];
  origens: Origem[];
  tiposServico: TipoServico[];
  onSelecionarOrdem: (ordem: OrdemServico) => void;
  onTransicionarEtapa?: (ordemId: number, novaEtapa: EtapaOrdemServico) => void;
  onErro?: (mensagem: string) => void;
}

export const TabelaOrdens: React.FC<TabelaOrdensProps> = ({
  ordens,
  origens,
  tiposServico,
  onSelecionarOrdem,
  onErro,
}) => {
  const [termo, setTermo] = useState('');
  const [etapaFiltro, setEtapaFiltro] = useState<string>('');
  const [origemFiltro, setOrigemFiltro] = useState<string>('');
  const [tipoServicoFiltro, setTipoServicoFiltro] = useState<string>('');
  const [faturadoFiltro, setFaturadoFiltro] = useState<string>('');
  const [somenteAtrasados, setSomenteAtrasados] = useState<boolean>(false);

  // Filtragem local instantânea
  const ordensFiltradas = ordens.filter((os) => {
    if (termo) {
      const t = termo.toLowerCase().replace(/[^a-z0-9]/g, '');
      const placaMatch = os.placa.toLowerCase().includes(t);
      const modeloMatch = os.modelo.toLowerCase().includes(termo.toLowerCase());
      const nfMatch = os.numeroNf?.toLowerCase().includes(termo.toLowerCase());
      if (!placaMatch && !modeloMatch && !nfMatch) return false;
    }

    if (etapaFiltro && os.etapa !== etapaFiltro) {
      return false;
    }

    if (origemFiltro && String(os.origemId) !== origemFiltro) {
      return false;
    }

    if (tipoServicoFiltro && String(os.tipoServicoId) !== tipoServicoFiltro) {
      return false;
    }

    if (faturadoFiltro !== '') {
      const isFat = faturadoFiltro === 'true';
      if (Boolean(os.faturado) !== isFat) return false;
    }

    if (somenteAtrasados && os.statusSla !== 'VERMELHO') {
      return false;
    }

    return true;
  });

  const limparFiltros = () => {
    setTermo('');
    setEtapaFiltro('');
    setOrigemFiltro('');
    setTipoServicoFiltro('');
    setFaturadoFiltro('');
    setSomenteAtrasados(false);
  };

  const handleExportar = (formato: 'xlsx' | 'csv') => {
    const filtros: Record<string, any> = {
      termo: termo || undefined,
      etapas: etapaFiltro ? [etapaFiltro] : undefined,
      origemId: origemFiltro || undefined,
      tipoServicoId: tipoServicoFiltro || undefined,
      faturado: faturadoFiltro !== '' ? faturadoFiltro === 'true' : undefined,
      emAtraso: somenteAtrasados ? true : undefined,
      // Mesma lista da tela: entregues de meses anteriores ficam no Histórico
      ocultarEntreguesAnteriores: true,
    };

    api.exportarOrdens(formato, filtros).catch((err: any) => {
      onErro?.(err.message || 'Falha ao exportar.');
    });
  };

  const formatarMoeda = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val || 0);
  };

  const formatarData = (dataStr?: string) => {
    if (!dataStr) return '-';
    try {
      const [ano, mes, dia] = dataStr.split('-');
      return `${dia}/${mes}/${ano}`;
    } catch {
      return dataStr;
    }
  };

  return (
    <div className="space-y-4">
      {/* Barra de Filtros e Busca */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          {/* Campo de Busca */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={termo}
              onChange={(e) => setTermo(e.target.value)}
              placeholder="Buscar por placa, modelo ou NF..."
              aria-label="Buscar por placa, modelo ou NF"
              className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Filtros em linha */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Etapa */}
            <select
              value={etapaFiltro}
              onChange={(e) => setEtapaFiltro(e.target.value)}
              aria-label="Filtrar por etapa"
              className="bg-slate-950/80 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="">Todas as Etapas</option>
              <option value="AGUARDANDO_ORCAMENTO">Aguardando Orçamento</option>
              <option value="ORCAMENTO">Orçamento</option>
              <option value="APROVADO">Aprovado</option>
              <option value="EM_SERVICO">Em Serviço</option>
              <option value="FINALIZADO">Finalizado</option>
              <option value="AGUARDANDO_RETIRADA">Aguardando Retirada</option>
              <option value="ENTREGUE">Entregue</option>
            </select>

            {/* Origem */}
            <select
              value={origemFiltro}
              onChange={(e) => setOrigemFiltro(e.target.value)}
              aria-label="Filtrar por origem"
              className="bg-slate-950/80 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="">Todas as Origens</option>
              {origens.map((origem) => (
                <option key={origem.id} value={origem.id}>
                  {origem.nome}
                </option>
              ))}
            </select>

            {/* Tipo de Serviço */}
            <select
              value={tipoServicoFiltro}
              onChange={(e) => setTipoServicoFiltro(e.target.value)}
              aria-label="Filtrar por tipo de serviço"
              className="bg-slate-950/80 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="">Todos os Serviços</option>
              {tiposServico.map((tipo) => (
                <option key={tipo.id} value={tipo.id}>
                  {tipo.nome}
                </option>
              ))}
            </select>

            {/* Faturado */}
            <select
              value={faturadoFiltro}
              onChange={(e) => setFaturadoFiltro(e.target.value)}
              aria-label="Filtrar por faturamento"
              className="bg-slate-950/80 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="">Faturamento (Todos)</option>
              <option value="true">Faturados</option>
              <option value="false">A Faturar</option>
            </select>

            {/* Checkbox Atrasados */}
            <label className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-700/80 bg-slate-950/80 text-xs text-rose-300 font-medium cursor-pointer select-none">
              <input
                type="checkbox"
                checked={somenteAtrasados}
                onChange={(e) => setSomenteAtrasados(e.target.checked)}
                className="rounded border-slate-700 text-rose-500 focus:ring-rose-500 bg-slate-900"
              />
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span>Em Atraso</span>
            </label>

            {/* Limpar Filtros */}
            {(termo || etapaFiltro || origemFiltro || tipoServicoFiltro || faturadoFiltro !== '' || somenteAtrasados) && (
              <button
                onClick={limparFiltros}
                title="Limpar todos os filtros"
                className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}

            {/* Botões de Exportação */}
            <div className="flex items-center gap-1.5 pl-2 border-l border-slate-800">
              <button
                onClick={() => handleExportar('xlsx')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
                title="Exportar dados filtrados para Excel (.xlsx)"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>Excel</span>
              </button>
              <button
                onClick={() => handleExportar('csv')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
                title="Exportar dados filtrados para CSV (.csv)"
              >
                <Download className="w-3.5 h-3.5 text-sky-400" />
                <span>CSV</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabela de Ordens */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4">OS</th>
                <th className="py-3.5 px-4">Placa</th>
                <th className="py-3.5 px-4">Veículo / Modelo</th>
                <th className="py-3.5 px-4">Origem</th>
                <th className="py-3.5 px-4">Serviço</th>
                <th className="py-3.5 px-4">Etapa Atual</th>
                <th className="py-3.5 px-4">Entrada</th>
                <th className="py-3.5 px-4 text-center">Dias Pátio</th>
                <th className="py-3.5 px-4 text-right">Orçamento</th>
                <th className="py-3.5 px-4 text-center">Faturado</th>
                <th className="py-3.5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {ordensFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    <p className="text-sm font-medium">Nenhuma ordem de serviço encontrada.</p>
                    <p className="text-xs text-slate-400 mt-1">Tente ajustar seus termos de busca ou filtros.</p>
                  </td>
                </tr>
              ) : (
                ordensFiltradas.map((ordem) => {
                  const isAtrasado = ordem.statusSla === 'VERMELHO';
                  const isAtencao = ordem.statusSla === 'AMARELO';

                  return (
                    <tr
                      key={ordem.id}
                      onClick={() => onSelecionarOrdem(ordem)}
                      onKeyDown={ativarComTeclado(() => onSelecionarOrdem(ordem))}
                      tabIndex={0}
                      className="hover:bg-slate-800/60 focus-visible:-outline-offset-2 transition-colors cursor-pointer group"
                    >
                      {/* OS ID */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-400">
                        #{String(ordem.id).padStart(5, '0')}
                      </td>

                      {/* Placa */}
                      <td className="py-3 px-4">
                        <PlacaBadge placa={ordem.placa} mercosul={ordem.mercosul} size="sm" />
                      </td>

                      {/* Modelo */}
                      <td className="py-3 px-4 font-medium text-slate-100 max-w-[200px] truncate">
                        {ordem.modelo}
                      </td>

                      {/* Origem */}
                      <td className="py-3 px-4 text-slate-300">
                        {ordem.origemNome || '-'}
                      </td>

                      {/* Tipo Serviço */}
                      <td className="py-3 px-4">
                        <span className="text-sky-400 font-medium">
                          {ordem.tipoServicoNome || '-'}
                        </span>
                      </td>

                      {/* Etapa */}
                      <td className="py-3 px-4">
                        <span className="inline-block px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-800 text-slate-200 border border-slate-700">
                          {ordem.etapaDescricao}
                        </span>
                      </td>

                      {/* Data Entrada */}
                      <td className="py-3 px-4 text-slate-400 font-mono">
                        {formatarData(ordem.dataEntrada)}
                      </td>

                      {/* Dias no Pátio / SLA */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 font-mono font-bold px-2 py-0.5 rounded-full text-[11px] ${
                            isAtrasado
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : isAtencao
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          {isAtrasado && <AlertTriangle className="w-3 h-3 text-rose-400" />}
                          {ordem.diasNoPatio}d
                        </span>
                      </td>

                      {/* Orçamento */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-100">
                        {formatarMoeda(ordem.valorOrcamento)}
                      </td>

                      {/* Faturado */}
                      <td className="py-3 px-4 text-center">
                        {ordem.faturado ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" />
                            Sim
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-full">
                            Não
                          </span>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => onSelecionarOrdem(ordem)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-sky-400 hover:bg-sky-500/10 transition-colors"
                          title="Abrir detalhes completos"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Rodapé da tabela com contagem */}
        <div className="p-3 bg-slate-950/80 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
          <span>
            Mostrando <strong>{ordensFiltradas.length}</strong> de <strong>{ordens.length}</strong> ordens de serviço
          </span>
          <span className="text-slate-400 font-mono">R-Fleet Operacional</span>
        </div>
      </div>
    </div>
  );
};
