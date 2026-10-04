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
      <div className="bg-etiqueta border border-trilho rounded-2xl p-4">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          {/* Campo de Busca */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-aco absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={termo}
              onChange={(e) => setTermo(e.target.value)}
              placeholder="Buscar por placa, modelo ou NF..."
              aria-label="Buscar por placa, modelo ou NF"
              className="w-full bg-parede/60 border border-trilho rounded-xl pl-9 pr-4 py-2 text-xs text-grafite placeholder-aco focus:outline-none focus:ring-2 focus:ring-mercosul"
            />
          </div>

          {/* Filtros em linha */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Etapa */}
            <select
              value={etapaFiltro}
              onChange={(e) => setEtapaFiltro(e.target.value)}
              aria-label="Filtrar por etapa"
              className="bg-parede/60 border border-trilho rounded-xl px-3 py-2 text-xs text-grafite focus:outline-none focus:ring-2 focus:ring-mercosul"
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
              className="bg-parede/60 border border-trilho rounded-xl px-3 py-2 text-xs text-grafite focus:outline-none focus:ring-2 focus:ring-mercosul"
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
              className="bg-parede/60 border border-trilho rounded-xl px-3 py-2 text-xs text-grafite focus:outline-none focus:ring-2 focus:ring-mercosul"
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
              className="bg-parede/60 border border-trilho rounded-xl px-3 py-2 text-xs text-grafite focus:outline-none focus:ring-2 focus:ring-mercosul"
            >
              <option value="">Faturamento (Todos)</option>
              <option value="true">Faturados</option>
              <option value="false">A Faturar</option>
            </select>

            {/* Checkbox Atrasados */}
            <label className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-trilho bg-parede/60 text-xs text-vermelho font-medium cursor-pointer select-none">
              <input
                type="checkbox"
                checked={somenteAtrasados}
                onChange={(e) => setSomenteAtrasados(e.target.checked)}
                className="rounded border-trilho text-vermelho focus:ring-vermelho bg-etiqueta"
              />
              <AlertTriangle className="w-3.5 h-3.5 text-vermelho" />
              <span>Parados</span>
            </label>

            {/* Limpar Filtros */}
            {(termo || etapaFiltro || origemFiltro || tipoServicoFiltro || faturadoFiltro !== '' || somenteAtrasados) && (
              <button
                onClick={limparFiltros}
                title="Limpar todos os filtros"
                className="p-2 rounded-xl text-aco hover:text-grafite hover:bg-parede transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}

            {/* Botões de Exportação */}
            <div className="flex items-center gap-1.5 pl-2 border-l border-trilho">
              <button
                onClick={() => handleExportar('xlsx')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-parede hover:bg-trilho/50 text-grafite text-xs font-semibold border border-trilho transition-all cursor-pointer"
                title="Exportar dados filtrados para Excel (.xlsx)"
              >
                <Download className="w-3.5 h-3.5 text-verde" />
                <span>Excel</span>
              </button>
              <button
                onClick={() => handleExportar('csv')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-parede hover:bg-trilho/50 text-grafite text-xs font-semibold border border-trilho transition-all cursor-pointer"
                title="Exportar dados filtrados para CSV (.csv)"
              >
                <Download className="w-3.5 h-3.5 text-mercosul" />
                <span>CSV</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabela de Ordens */}
      <div className="bg-etiqueta border border-trilho rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-trilho bg-parede/60 text-aco font-semibold uppercase tracking-wider">
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
            <tbody className="divide-y divide-trilho">
              {ordensFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-aco">
                    <p className="text-sm font-medium">Nenhuma ordem de serviço encontrada.</p>
                    <p className="text-xs text-aco mt-1">Tente ajustar seus termos de busca ou filtros.</p>
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
                      className="hover:bg-parede focus-visible:-outline-offset-2 transition-colors cursor-pointer group"
                    >
                      {/* OS ID */}
                      <td className="py-3 px-4 font-placa tabular-nums font-bold text-aco">
                        #{String(ordem.id).padStart(5, '0')}
                      </td>

                      {/* Placa */}
                      <td className="py-3 px-4">
                        <PlacaBadge placa={ordem.placa} mercosul={ordem.mercosul} size="sm" />
                      </td>

                      {/* Modelo */}
                      <td className="py-3 px-4 font-medium text-grafite max-w-[200px] truncate">
                        {ordem.modelo}
                      </td>

                      {/* Origem */}
                      <td className="py-3 px-4 text-grafite">
                        {ordem.origemNome || '-'}
                      </td>

                      {/* Tipo Serviço */}
                      <td className="py-3 px-4">
                        <span className="text-mercosul font-medium">
                          {ordem.tipoServicoNome || '-'}
                        </span>
                      </td>

                      {/* Etapa */}
                      <td className="py-3 px-4">
                        <span className="inline-block px-2.5 py-1 rounded-md text-[11px] font-semibold bg-parede text-grafite border border-trilho">
                          {ordem.etapaDescricao}
                        </span>
                      </td>

                      {/* Data Entrada */}
                      <td className="py-3 px-4 text-aco font-placa tabular-nums">
                        {formatarData(ordem.dataEntrada)}
                      </td>

                      {/* Dias no Pátio / SLA */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 font-placa tabular-nums font-bold px-2 py-0.5 rounded-full text-[11px] ${
                            isAtrasado
                              ? 'bg-vermelho/10 text-vermelho border border-vermelho/40'
                              : isAtencao
                              ? 'bg-amarelo/15 text-amarelo-tinta border border-amarelo/60'
                              : 'bg-verde/10 text-verde border border-verde/40'
                          }`}
                        >
                          {isAtrasado && <AlertTriangle className="w-3 h-3 text-vermelho" />}
                          {ordem.diasNoPatio}d
                        </span>
                      </td>

                      {/* Orçamento */}
                      <td className="py-3 px-4 text-right font-placa tabular-nums font-bold text-grafite">
                        {formatarMoeda(ordem.valorOrcamento)}
                      </td>

                      {/* Faturado */}
                      <td className="py-3 px-4 text-center">
                        {ordem.faturado ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-verde bg-verde/10 px-2 py-0.5 rounded-full border border-verde/40">
                            <CheckCircle2 className="w-3 h-3" />
                            Sim
                          </span>
                        ) : (
                          <span className="text-[10px] text-aco bg-parede px-2 py-0.5 rounded-full">
                            Não
                          </span>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => onSelecionarOrdem(ordem)}
                          className="p-1.5 rounded-lg text-aco hover:text-mercosul hover:bg-mercosul/10 transition-colors"
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
        <div className="p-3 bg-parede/60 border-t border-trilho text-xs text-aco flex items-center justify-between">
          <span>
            Mostrando <strong>{ordensFiltradas.length}</strong> de <strong>{ordens.length}</strong> ordens de serviço
          </span>
          <span className="text-aco font-placa tabular-nums">R-Fleet Operacional</span>
        </div>
      </div>
    </div>
  );
};
