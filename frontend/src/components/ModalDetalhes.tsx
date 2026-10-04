import React, { useState, useEffect } from 'react';
import {
  OrdemServico,
  EtapaOrdemServico,
  HistoricoEtapa,
  AnexoOs,
} from '../types';
import { api } from '../services/api';
import { PlacaBadge } from './PlacaBadge';
import { useDialogo } from '../utils/acessibilidade';
import {
  X,
  Clock,
  DollarSign,
  AlertTriangle,
  History,
  Paperclip,
  Upload,
  Download,
  Trash2,
  Edit2,
  FileText,
  Receipt,
  ArrowRight,
  Archive,
  ArchiveRestore,
} from 'lucide-react';

// Mesmo limite do backend (spring.servlet.multipart.max-file-size)
const TAMANHO_MAXIMO_ANEXO = 8 * 1024 * 1024;

interface ModalDetalhesProps {
  ordemId: number;
  onFechar: () => void;
  onAtualizada: (ordem: OrdemServico) => void;
  onExcluida: (ordem: OrdemServico) => void;
}

const TODAS_ETAPAS: { etapa: EtapaOrdemServico; label: string }[] = [
  { etapa: 'AGUARDANDO_ORCAMENTO', label: 'Aguardando Orçamento' },
  { etapa: 'ORCAMENTO', label: 'Orçamento' },
  { etapa: 'APROVADO', label: 'Aprovado' },
  { etapa: 'EM_SERVICO', label: 'Em Serviço' },
  { etapa: 'FINALIZADO', label: 'Finalizado' },
  { etapa: 'AGUARDANDO_RETIRADA', label: 'Aguardando Retirada' },
  { etapa: 'ENTREGUE', label: 'Entregue' },
];

export const ModalDetalhes: React.FC<ModalDetalhesProps> = ({
  ordemId,
  onFechar,
  onAtualizada,
  onExcluida,
}) => {
  const [ordem, setOrdem] = useState<OrdemServico | null>(null);
  const [aba, setAba] = useState<'geral' | 'financeiro' | 'historico' | 'anexos'>('geral');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // Histórico
  const [historico, setHistorico] = useState<HistoricoEtapa[]>([]);
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);

  // Anexos
  const [anexos, setAnexos] = useState<AnexoOs[]>([]);
  const [enviandoAnexo, setEnviandoAnexo] = useState(false);

  // Ação de transição
  const [novaEtapa, setNovaEtapa] = useState<EtapaOrdemServico>('AGUARDANDO_ORCAMENTO');
  const [obsTransicao, setObsTransicao] = useState('');
  const [salvandoTransicao, setSalvandoTransicao] = useState(false);

  // Edição de Orçamento
  const [editandoOrcamento, setEditandoOrcamento] = useState(false);
  const [novoValor, setNovoValor] = useState('');
  const [justificativaOrcamento, setJustificativaOrcamento] = useState('');
  const [salvandoOrcamento, setSalvandoOrcamento] = useState(false);

  // Faturamento
  const [faturado, setFaturado] = useState(false);
  const [dataFaturamento, setDataFaturamento] = useState('');
  const [numeroNf, setNumeroNf] = useState('');
  const [salvandoFaturamento, setSalvandoFaturamento] = useState(false);

  // Arquivamento: arquivar exige motivo; restaurar não
  const [confirmandoArquivamento, setConfirmandoArquivamento] = useState(false);
  const [motivoArquivamento, setMotivoArquivamento] = useState('');
  const [salvandoArquivamento, setSalvandoArquivamento] = useState(false);

  // Exclusão definitiva (só OS arquivada): libera depois de digitar a placa
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const [placaConfirmacao, setPlacaConfirmacao] = useState('');
  const [excluindo, setExcluindo] = useState(false);

  const carregarDados = async () => {
    try {
      setCarregando(true);
      const data = await api.obterOrdem(ordemId);
      setOrdem(data);
      setNovaEtapa(data.etapa);
      setFaturado(Boolean(data.faturado));
      setDataFaturamento(data.dataFaturamento || '');
      setNumeroNf(data.numeroNf || '');
      setNovoValor(data.valorOrcamento ? String(data.valorOrcamento) : '0');
    } catch (err: any) {
      setErro(err.message || 'Erro ao carregar detalhes da ordem de serviço.');
    } finally {
      setCarregando(false);
    }
  };

  const carregarHistorico = async () => {
    try {
      setCarregandoHistorico(true);
      const data = await api.obterHistorico(ordemId);
      setHistorico(data);
    } catch {
      // Ignora erro
    } finally {
      setCarregandoHistorico(false);
    }
  };

  const carregarAnexos = async () => {
    try {
      const data = await api.listarAnexos(ordemId);
      setAnexos(data);
    } catch {
      // Ignora erro
    }
  };

  const dialogoRef = useDialogo<HTMLDivElement>(onFechar);

  useEffect(() => {
    carregarDados();
  }, [ordemId]);

  useEffect(() => {
    if (aba === 'historico') carregarHistorico();
    if (aba === 'anexos') carregarAnexos();
  }, [aba]);

  const handleTransicionarEtapa = async () => {
    if (!ordem) return;
    setSalvandoTransicao(true);
    try {
      const atualizada = await api.transicionarEtapa(ordem.id, novaEtapa, obsTransicao.trim() || undefined);
      setOrdem(atualizada);
      onAtualizada(atualizada);
      setObsTransicao('');
      carregarHistorico();
    } catch (err: any) {
      setErro(err.message);
    } finally {
      setSalvandoTransicao(false);
    }
  };

  const handleSalvarOrcamento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ordem) return;
    setSalvandoOrcamento(true);
    try {
      const valorNum = Number(novoValor.replace(/\./g, '').replace(',', '.')) || 0;
      const atualizada = await api.atualizarOrcamento(ordem.id, valorNum, justificativaOrcamento.trim() || undefined);
      setOrdem(atualizada);
      onAtualizada(atualizada);
      setEditandoOrcamento(false);
      setJustificativaOrcamento('');
      carregarHistorico();
    } catch (err: any) {
      setErro(err.message);
    } finally {
      setSalvandoOrcamento(false);
    }
  };

  const handleSalvarFaturamento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ordem) return;
    setSalvandoFaturamento(true);
    try {
      const atualizada = await api.atualizarFaturamento(
        ordem.id,
        faturado,
        dataFaturamento || undefined,
        numeroNf.trim() || undefined
      );
      setOrdem(atualizada);
      onAtualizada(atualizada);
      carregarHistorico();
    } catch (err: any) {
      setErro(err.message);
    } finally {
      setSalvandoFaturamento(false);
    }
  };

  const handleAlterarArquivamento = async (arquivada: boolean) => {
    if (!ordem) return;
    if (arquivada && !motivoArquivamento.trim()) return;
    setSalvandoArquivamento(true);
    try {
      const atualizada = await api.alterarArquivamento(
        ordem.id,
        arquivada,
        arquivada ? motivoArquivamento.trim() : undefined
      );
      setOrdem(atualizada);
      onAtualizada(atualizada);
      setConfirmandoArquivamento(false);
      setMotivoArquivamento('');
      carregarHistorico();
    } catch (err: any) {
      setErro(err.message || 'Falha ao alterar o arquivamento.');
    } finally {
      setSalvandoArquivamento(false);
    }
  };

  const placaConfere = (digitada: string) =>
    !!ordem && digitada.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() === ordem.placa;

  const handleExcluirOrdem = async () => {
    if (!ordem || !placaConfere(placaConfirmacao)) return;
    setExcluindo(true);
    try {
      await api.excluirOrdem(ordem.id);
      onExcluida(ordem);
    } catch (err: any) {
      setErro(err.message || 'Falha ao excluir a OS.');
      setExcluindo(false);
    }
  };

  const handleUploadArquivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!ordem || !e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    if (file.size > TAMANHO_MAXIMO_ANEXO) {
      setErro('O arquivo excede o tamanho máximo permitido de 8 MB.');
      e.target.value = '';
      return;
    }
    setEnviandoAnexo(true);
    try {
      await api.uploadAnexo(ordem.id, file);
      carregarAnexos();
    } catch (err: any) {
      setErro(err.message || 'Erro no envio do anexo.');
    } finally {
      setEnviandoAnexo(false);
      e.target.value = '';
    }
  };

  const handleExcluirAnexo = async (anexoId: number) => {
    if (!confirm('Deseja excluir este anexo permanentemente?')) return;
    try {
      await api.excluirAnexo(anexoId);
      setAnexos((prev) => prev.filter((a) => a.id !== anexoId));
    } catch (err: any) {
      setErro(err.message);
    }
  };

  const handleBaixarAnexo = async (anexoId: number, nomeArquivo: string) => {
    try {
      await api.baixarAnexo(anexoId, nomeArquivo);
    } catch (err: any) {
      setErro(err.message || 'Falha ao baixar o arquivo.');
    }
  };

  const formatarMoeda = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val || 0);
  };

  const formatarDataHora = (dataStr: string) => {
    try {
      const d = new Date(dataStr);
      return d.toLocaleString('pt-BR');
    } catch {
      return dataStr;
    }
  };

  if (carregando || !ordem) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
        <div
          ref={dialogoRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-busy="true"
          aria-label="Carregando Ordem de Serviço"
          className="outline-none bg-slate-900 border border-slate-800 p-8 rounded-2xl text-center"
        >
          <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-300">Carregando detalhes da Ordem de Serviço...</p>
        </div>
      </div>
    );
  }

  const isAtrasado = ordem.statusSla === 'VERMELHO';
  const isAtencao = ordem.statusSla === 'AMARELO';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div
        ref={dialogoRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-detalhes-titulo"
        className="outline-none bg-slate-900 border border-slate-800 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header do Modal */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-3">
            <PlacaBadge placa={ordem.placa} mercosul={ordem.mercosul} size="md" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-slate-400">
                  #{String(ordem.id).padStart(5, '0')}
                </span>
                <span className="text-slate-600" aria-hidden="true">&bull;</span>
                <h3 id="modal-detalhes-titulo" className="text-base font-bold text-slate-100">{ordem.modelo}</h3>
              </div>
              <p className="text-xs text-slate-400">
                Entrada em {ordem.dataEntrada ? ordem.dataEntrada.split('-').reverse().join('/') : '-'}
              </p>
            </div>
          </div>

          <button
            onClick={onFechar}
            aria-label="Fechar"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Abas */}
        <div className="flex items-center gap-1 px-5 border-b border-slate-800 bg-slate-950/40">
          <button
            onClick={() => setAba('geral')}
            aria-pressed={aba === 'geral'}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              aba === 'geral'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Visão Geral</span>
          </button>

          <button
            onClick={() => setAba('financeiro')}
            aria-pressed={aba === 'financeiro'}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              aba === 'financeiro'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>Orçamento &amp; Faturamento</span>
          </button>

          <button
            onClick={() => setAba('historico')}
            aria-pressed={aba === 'historico'}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              aba === 'historico'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Linha do Tempo (Auditoria)</span>
          </button>

          <button
            onClick={() => setAba('anexos')}
            aria-pressed={aba === 'anexos'}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              aba === 'anexos'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Paperclip className="w-4 h-4" />
            <span>Anexos ({anexos.length})</span>
          </button>
        </div>

        {/* Conteúdo das Abas */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {erro && (
            <div role="alert" className="p-3 bg-rose-950/80 border border-rose-500/50 rounded-xl text-rose-300 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{erro}</span>
            </div>
          )}

          {!ordem.ativo && (
            <div className="p-3 bg-amber-950/40 border border-amber-700/60 rounded-xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-2 text-xs text-amber-200">
                  <Archive className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                  <span>
                    Esta OS está arquivada: não aparece na operação, no dashboard nem nas exportações. O motivo
                    está na Linha do Tempo.
                  </span>
                </div>
                <div className="shrink-0 flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => handleAlterarArquivamento(false)}
                    disabled={salvandoArquivamento || excluindo}
                    className="shrink-0 px-4 py-2 rounded-xl text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5 justify-center"
                  >
                    {salvandoArquivamento ? (
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <ArchiveRestore className="w-3.5 h-3.5" />
                        <span>Restaurar OS</span>
                      </>
                    )}
                  </button>
                  {!confirmandoExclusao && (
                    <button
                      onClick={() => setConfirmandoExclusao(true)}
                      disabled={salvandoArquivamento}
                      className="shrink-0 px-4 py-2 rounded-xl text-xs font-bold text-rose-300 border border-rose-700 hover:bg-rose-900/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5 justify-center"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Excluir de vez</span>
                    </button>
                  )}
                </div>
              </div>

              {confirmandoExclusao && (
                <div className="pt-3 border-t border-amber-800/50 space-y-3">
                  <p className="text-xs text-rose-200">
                    Isto apaga a OS #{String(ordem.id).padStart(5, '0')} com a linha do tempo e os anexos dela. Não
                    tem como desfazer. O veículo continua cadastrado. Digite a placa{' '}
                    <strong className="font-mono">{ordem.placa}</strong> para confirmar.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      value={placaConfirmacao}
                      onChange={(e) => setPlacaConfirmacao(e.target.value)}
                      placeholder={ordem.placa}
                      aria-label="Placa para confirmar a exclusão"
                      autoFocus
                      className="flex-1 bg-slate-900 border border-rose-800 rounded-xl px-3 py-2 text-xs font-mono uppercase text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                    <button
                      onClick={() => {
                        setConfirmandoExclusao(false);
                        setPlacaConfirmacao('');
                      }}
                      disabled={excluindo}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-all disabled:opacity-40 cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleExcluirOrdem}
                      disabled={excluindo || !placaConfere(placaConfirmacao)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5 justify-center"
                    >
                      {excluindo ? (
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Excluir definitivamente</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ABA GERAL */}
          {aba === 'geral' && (
            <div className="space-y-6">
              {/* Painel de Etapa e SLA */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-400 uppercase font-semibold">Etapa Atual</span>
                  <p className="text-base font-bold text-slate-100 mt-1">
                    {ordem.etapaDescricao}
                  </p>
                </div>

                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-400 uppercase font-semibold">SLA / Pátio</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    {isAtrasado ? (
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                    ) : (
                      <Clock className="w-4 h-4 text-emerald-400" />
                    )}
                    <span
                      className={`text-base font-mono font-bold ${
                        isAtrasado ? 'text-rose-400' : isAtencao ? 'text-amber-400' : 'text-emerald-400'
                      }`}
                    >
                      {ordem.diasNoPatio} {ordem.diasNoPatio === 1 ? 'dia' : 'dias'}
                    </span>
                    <span className="text-xs text-slate-400">
                      ({ordem.statusSla === 'VERMELHO' ? 'Em Atraso' : 'Dentro do Prazo'})
                    </span>
                  </div>
                </div>

                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-400 uppercase font-semibold">Valor Orçado</span>
                  <p className="text-base font-mono font-bold text-emerald-400 mt-1">
                    {formatarMoeda(ordem.valorOrcamento)}
                  </p>
                </div>
              </div>

              {/* Informações detalhadas do veículo */}
              <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/80 space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Detalhes Operacionais
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block">Origem</span>
                    <span className="font-semibold text-slate-200">{ordem.origemNome || 'Não informada'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Tipo de Serviço</span>
                    <span className="font-semibold text-sky-400">{ordem.tipoServicoNome || 'Geral'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Data de Entrada</span>
                    <span className="font-mono text-slate-200">
                      {ordem.dataEntrada ? ordem.dataEntrada.split('-').reverse().join('/') : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Data de Saída</span>
                    <span className="font-mono text-slate-200">
                      {ordem.dataSaida ? ordem.dataSaida.split('-').reverse().join('/') : 'Em aberto'}
                    </span>
                  </div>
                </div>

                {ordem.observacoes && (
                  <div className="pt-2 border-t border-slate-800/60">
                    <span className="text-slate-400 block text-xs">Observações</span>
                    <p className="text-xs text-slate-300 mt-0.5 whitespace-pre-wrap">{ordem.observacoes}</p>
                  </div>
                )}
              </div>

              {/* Transição de Etapa Rápida (OS arquivada não muda de etapa) */}
              {ordem.ativo && (
                <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-3">
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Alterar Etapa Operacional
                  </h4>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <select
                      value={novaEtapa}
                      onChange={(e) => setNovaEtapa(e.target.value as EtapaOrdemServico)}
                      aria-label="Nova etapa"
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    >
                      {TODAS_ETAPAS.map((item) => (
                        <option key={item.etapa} value={item.etapa}>
                          {item.label}
                        </option>
                      ))}
                    </select>

                    <input
                      type="text"
                      value={obsTransicao}
                      onChange={(e) => setObsTransicao(e.target.value)}
                      placeholder="Motivo ou nota da mudança (opcional)"
                      aria-label="Nota da mudança de etapa"
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />

                    <button
                      onClick={handleTransicionarEtapa}
                      disabled={salvandoTransicao || novaEtapa === ordem.etapa}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5 justify-center"
                    >
                      {salvandoTransicao ? (
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <span>Atualizar</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Arquivamento: tira a OS da operação sem apagar nada */}
              {ordem.ativo && (
                <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800 space-y-3">
                  {!confirmandoArquivamento ? (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <p className="text-xs text-slate-400">
                        Lançou errado ou o cliente desistiu? Arquive a OS: ela sai da operação, mas fica
                        guardada e pode ser restaurada no Histórico.
                      </p>
                      <button
                        onClick={() => setConfirmandoArquivamento(true)}
                        className="shrink-0 px-4 py-2 rounded-xl text-xs font-bold text-amber-300 border border-amber-700/70 hover:bg-amber-900/30 transition-all cursor-pointer flex items-center gap-1.5 justify-center"
                      >
                        <Archive className="w-3.5 h-3.5" />
                        <span>Arquivar OS</span>
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs text-slate-300">
                        Por que esta OS está sendo arquivada? O motivo fica registrado na linha do tempo.
                      </p>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <input
                          type="text"
                          value={motivoArquivamento}
                          onChange={(e) => setMotivoArquivamento(e.target.value)}
                          placeholder="Ex.: entrada lançada em duplicidade"
                          aria-label="Motivo do arquivamento"
                          autoFocus
                          className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                        <button
                          onClick={() => {
                            setConfirmandoArquivamento(false);
                            setMotivoArquivamento('');
                          }}
                          disabled={salvandoArquivamento}
                          className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-all disabled:opacity-40 cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => handleAlterarArquivamento(true)}
                          disabled={salvandoArquivamento || !motivoArquivamento.trim()}
                          className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5 justify-center"
                        >
                          {salvandoArquivamento ? (
                            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <>
                              <Archive className="w-3.5 h-3.5" />
                              <span>Arquivar</span>
                            </>
                          )}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ABA FINANCEIRO */}
          {aba === 'financeiro' && (
            <div className="space-y-6">
              {/* Ajuste de Orçamento */}
              <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-100">Valor Orçado da OS</h4>
                    <p className="text-xs text-slate-400">
                      Toda alteração de valor é registrada na linha do tempo de auditoria
                    </p>
                  </div>
                  {!editandoOrcamento && (
                    <button
                      onClick={() => setEditandoOrcamento(true)}
                      className="flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 font-semibold px-3 py-1.5 rounded-lg bg-sky-500/10 border border-sky-500/20"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Alterar Valor</span>
                    </button>
                  )}
                </div>

                {!editandoOrcamento ? (
                  <div className="text-2xl font-mono font-bold text-emerald-400">
                    {formatarMoeda(ordem.valorOrcamento)}
                  </div>
                ) : (
                  <form onSubmit={handleSalvarOrcamento} className="space-y-3 pt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="detalhes-novo-valor" className="block text-xs font-semibold text-slate-300 mb-1">
                          Novo Valor (R$) *
                        </label>
                        <input
                          type="text"
                          required
                          value={novoValor}
                          id="detalhes-novo-valor"
                          onChange={(e) => setNovoValor(e.target.value)}
                          placeholder="Ex: 1500.00"
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                        />
                      </div>
                      <div>
                        <label htmlFor="detalhes-justificativa" className="block text-xs font-semibold text-slate-300 mb-1">
                          Justificativa da Mudança (Opcional)
                        </label>
                        <input
                          type="text"
                          value={justificativaOrcamento}
                          id="detalhes-justificativa"
                          onChange={(e) => setJustificativaOrcamento(e.target.value)}
                          placeholder="Ex: Adição de peças ou mão de obra extra"
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="submit"
                        disabled={salvandoOrcamento}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                      >
                        {salvandoOrcamento ? 'Salvando...' : 'Salvar Novo Valor'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditandoOrcamento(false)}
                        className="px-3 py-1.5 text-slate-400 hover:text-slate-200 text-xs font-medium"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Status de Faturamento */}
              <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-sm font-bold text-slate-100">Status de Faturamento</h4>
                </div>

                <form onSubmit={handleSalvarFaturamento} className="space-y-4">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-200">
                      <input
                        type="checkbox"
                        checked={faturado}
                        onChange={(e) => setFaturado(e.target.checked)}
                        className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 bg-slate-900 w-4 h-4"
                      />
                      <span>Ordem de Serviço Faturada</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="detalhes-data-faturamento" className="block text-xs font-semibold text-slate-300 mb-1">
                        Data de Faturamento
                      </label>
                      <input
                        type="date"
                        value={dataFaturamento}
                        id="detalhes-data-faturamento"
                        onChange={(e) => setDataFaturamento(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                    </div>

                    <div>
                      <label htmlFor="detalhes-numero-nf" className="block text-xs font-semibold text-slate-300 mb-1">
                        Número da Nota Fiscal (NF)
                      </label>
                      <input
                        type="text"
                        value={numeroNf}
                        id="detalhes-numero-nf"
                        onChange={(e) => setNumeroNf(e.target.value)}
                        placeholder="Ex: NF-2026-0045"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={salvandoFaturamento}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                  >
                    {salvandoFaturamento ? 'Atualizando...' : 'Atualizar Faturamento'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ABA HISTÓRICO / AUDITORIA */}
          {aba === 'historico' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Linha do Tempo Completa de Auditoria
                </h4>
                <span className="text-[11px] text-slate-400 font-mono">
                  Registros imutáveis
                </span>
              </div>

              {carregandoHistorico ? (
                <div className="py-12 text-center text-slate-400">
                  <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-xs">Carregando histórico...</p>
                </div>
              ) : historico.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Nenhum registro histórico encontrado.
                </div>
              ) : (
                <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                  {historico.map((h) => (
                    <div key={h.id} className="relative group">
                      {/* Ponto na timeline */}
                      <span className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-sky-500 border-2 border-slate-900 group-hover:scale-125 transition-transform" />

                      <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-200">
                            {h.etapaAnteriorDescricao
                              ? `${h.etapaAnteriorDescricao} → ${h.etapaNovaDescricao}`
                              : `Etapa: ${h.etapaNovaDescricao}`}
                          </span>
                          <span className="text-[11px] font-mono text-slate-400">
                            {formatarDataHora(h.dataHora)}
                          </span>
                        </div>

                        {h.observacao && (
                          <p className="text-xs text-slate-300 italic">{h.observacao}</p>
                        )}

                        <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400 border-t border-slate-900">
                          <span>Responsável: {h.usuarioNome}</span>
                          <span className="font-mono text-slate-400">
                            Orçamento: {formatarMoeda(h.valorOrcamentoMomento)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ABA ANEXOS */}
          {aba === 'anexos' && (
            <div className="space-y-4">
              {/* Dropzone de Upload */}
              <div className="border-2 border-dashed border-slate-700 hover:border-sky-500 has-[:focus-visible]:border-sky-500 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-sky-400 rounded-2xl p-6 text-center transition-colors">
                <input
                  type="file"
                  id="file-upload"
                  onChange={handleUploadArquivo}
                  disabled={enviandoAnexo}
                  className="sr-only"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer flex flex-col items-center justify-center space-y-2"
                >
                  <div className="w-10 h-10 rounded-full bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-sky-400 hover:underline">
                      Clique para enviar um arquivo
                    </span>
                    <span className="text-xs text-slate-400 block mt-0.5">
                      Fotos de avarias, ordens assinadas, PDFs de vistoria (até 8MB)
                    </span>
                  </div>
                </label>
                {enviandoAnexo && (
                  <p role="status" className="text-xs text-sky-400 mt-2 font-medium">Enviando anexo...</p>
                )}
              </div>

              {/* Lista de Arquivos */}
              <div className="space-y-2">
                {anexos.length === 0 ? (
                  <p className="text-center py-6 text-xs text-slate-400">
                    Nenhum anexo registrado para esta ordem de serviço.
                  </p>
                ) : (
                  anexos.map((anexo) => (
                    <div
                      key={anexo.id}
                      className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <Paperclip className="w-4 h-4 text-slate-400 shrink-0" />
                        <div className="truncate">
                          <span className="font-semibold text-slate-200 block truncate">
                            {anexo.nomeArquivo}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {(anexo.tamanhoBytes / 1024).toFixed(1)} KB &bull; {anexo.usuarioNome}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleBaixarAnexo(anexo.id, anexo.nomeArquivo)}
                          className="p-1.5 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded-lg transition-colors"
                          title="Baixar arquivo"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleExcluirAnexo(anexo.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                          title="Excluir arquivo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
