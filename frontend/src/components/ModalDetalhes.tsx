import React, { useState, useEffect } from 'react';
import {
  OrdemServico,
  EtapaOrdemServico,
  HistoricoEtapa,
  AnexoOs,
  Origem,
  TipoServico,
} from '../types';
import { api } from '../services/api';
import { PlacaBadge } from './PlacaBadge';
import { hojeNaOficina, rotuloMesLongo } from '../utils/meses';
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
  origens: Origem[];
  tiposServico: TipoServico[];
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
  origens,
  tiposServico,
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
  const [dataEntrega, setDataEntrega] = useState(hojeNaOficina);
  const [salvandoTransicao, setSalvandoTransicao] = useState(false);

  // Correção dos dados da entrada (placa, modelo, origem, tipo de serviço)
  const [editandoDados, setEditandoDados] = useState(false);
  const [placaEdit, setPlacaEdit] = useState('');
  const [modeloEdit, setModeloEdit] = useState('');
  const [origemEdit, setOrigemEdit] = useState('');
  const [tipoEdit, setTipoEdit] = useState('');
  const [salvandoDados, setSalvandoDados] = useState(false);
  const [erroDados, setErroDados] = useState<string | null>(null);

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
      setDataEntrega(hojeNaOficina());
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

  // Entrega: a data vem de hoje, mas pode ser trocada pelo calendário (entre a entrada e hoje)
  const hoje = hojeNaOficina();
  const entregando = novaEtapa === 'ENTREGUE';
  const dataEntregaValida =
    /^\d{4}-\d{2}-\d{2}$/.test(dataEntrega) &&
    dataEntrega <= hoje &&
    (!ordem?.dataEntrada || dataEntrega >= ordem.dataEntrada);
  const entregaEmMesAnterior = entregando && dataEntregaValida && dataEntrega.slice(0, 7) < hoje.slice(0, 7);

  const handleTransicionarEtapa = async () => {
    if (!ordem) return;
    setSalvandoTransicao(true);
    try {
      const atualizada = await api.transicionarEtapa(
        ordem.id,
        novaEtapa,
        obsTransicao.trim() || undefined,
        novaEtapa === 'ENTREGUE' ? dataEntrega : undefined
      );
      setOrdem(atualizada);
      onAtualizada(atualizada);
      setObsTransicao('');
      setDataEntrega(hojeNaOficina());
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

  const abrirEdicaoDados = () => {
    if (!ordem) return;
    setPlacaEdit(ordem.placa);
    setModeloEdit(ordem.modelo);
    setOrigemEdit(ordem.origemId ? String(ordem.origemId) : '');
    setTipoEdit(ordem.tipoServicoId ? String(ordem.tipoServicoId) : '');
    setErroDados(null);
    setEditandoDados(true);
  };

  const cancelarEdicaoDados = () => {
    setEditandoDados(false);
    setErroDados(null);
  };

  const placaEditValida = /^([A-Z]{3}[0-9]{4}|[A-Z]{3}[0-9][A-Z][0-9]{2})$/.test(placaEdit);
  const dadosAlterados =
    !!ordem &&
    (placaEdit !== ordem.placa ||
      modeloEdit.trim().toUpperCase() !== ordem.modelo ||
      origemEdit !== (ordem.origemId ? String(ordem.origemId) : '') ||
      tipoEdit !== (ordem.tipoServicoId ? String(ordem.tipoServicoId) : ''));

  const handleSalvarDados = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ordem || !placaEditValida || !modeloEdit.trim() || !dadosAlterados) return;
    setSalvandoDados(true);
    setErroDados(null);
    try {
      const atualizada = await api.atualizarDados(ordem.id, {
        placa: placaEdit,
        modelo: modeloEdit.trim().toUpperCase(),
        origemId: origemEdit ? Number(origemEdit) : null,
        tipoServicoId: tipoEdit ? Number(tipoEdit) : null,
      });
      setOrdem(atualizada);
      onAtualizada(atualizada);
      setEditandoDados(false);
      carregarHistorico();
    } catch (err: any) {
      setErroDados(err.message || 'Falha ao salvar a correção.');
    } finally {
      setSalvandoDados(false);
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div
          ref={dialogoRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-busy="true"
          aria-label="Carregando Ordem de Serviço"
          className="outline-none bg-etiqueta border border-trilho p-8 rounded-2xl text-center"
        >
          <div className="w-8 h-8 border-2 border-mercosul border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-grafite">Carregando detalhes da Ordem de Serviço...</p>
        </div>
      </div>
    );
  }

  const isAtrasado = ordem.statusSla === 'VERMELHO';
  const isAtencao = ordem.statusSla === 'AMARELO';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div
        ref={dialogoRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-detalhes-titulo"
        className="outline-none bg-etiqueta border border-trilho w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header do Modal */}
        <div className="p-5 border-b border-trilho flex items-center justify-between bg-parede/60">
          <div className="flex items-center gap-3">
            <PlacaBadge placa={ordem.placa} mercosul={ordem.mercosul} size="md" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-placa tabular-nums text-xs font-bold text-aco">
                  #{String(ordem.id).padStart(5, '0')}
                </span>
                <span className="text-trilho" aria-hidden="true">&bull;</span>
                <h3 id="modal-detalhes-titulo" className="text-base font-bold text-grafite">{ordem.modelo}</h3>
              </div>
              <p className="text-xs text-aco">
                Entrada em {ordem.dataEntrada ? ordem.dataEntrada.split('-').reverse().join('/') : '-'}
              </p>
            </div>
          </div>

          <button
            onClick={onFechar}
            aria-label="Fechar"
            className="p-1.5 rounded-lg text-aco hover:text-grafite hover:bg-parede transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Abas */}
        <div className="flex items-center gap-1 px-5 border-b border-trilho bg-parede/60">
          <button
            onClick={() => setAba('geral')}
            aria-pressed={aba === 'geral'}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              aba === 'geral'
                ? 'border-mercosul text-mercosul'
                : 'border-transparent text-aco hover:text-grafite'
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
                ? 'border-mercosul text-mercosul'
                : 'border-transparent text-aco hover:text-grafite'
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
                ? 'border-mercosul text-mercosul'
                : 'border-transparent text-aco hover:text-grafite'
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
                ? 'border-mercosul text-mercosul'
                : 'border-transparent text-aco hover:text-grafite'
            }`}
          >
            <Paperclip className="w-4 h-4" />
            <span>Anexos ({anexos.length})</span>
          </button>
        </div>

        {/* Conteúdo das Abas */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {erro && (
            <div role="alert" className="p-3 bg-vermelho/10 border border-vermelho/40 rounded-xl text-vermelho text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-vermelho mt-0.5" />
              <span>{erro}</span>
            </div>
          )}

          {!ordem.ativo && (
            <div className="p-3 bg-amarelo/15 border border-amarelo/60 rounded-xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-2 text-xs text-amarelo-tinta">
                  <Archive className="w-4 h-4 shrink-0 text-amarelo-tinta mt-0.5" />
                  <span>
                    Esta OS está arquivada: não aparece na operação, no dashboard nem nas exportações. O motivo
                    está na Linha do Tempo.
                  </span>
                </div>
                <div className="shrink-0 flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => handleAlterarArquivamento(false)}
                    disabled={salvandoArquivamento || excluindo}
                    className="shrink-0 px-4 py-2 rounded-xl text-xs font-bold text-sobre-cor bg-mercosul hover:bg-mercosul/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5 justify-center"
                  >
                    {salvandoArquivamento ? (
                      <div className="w-3.5 h-3.5 border-2 border-sobre-cor/30 border-t-sobre-cor rounded-full animate-spin" />
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
                      className="shrink-0 px-4 py-2 rounded-xl text-xs font-bold text-vermelho border border-vermelho/40 hover:bg-vermelho/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5 justify-center"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Excluir de vez</span>
                    </button>
                  )}
                </div>
              </div>

              {confirmandoExclusao && (
                <div className="pt-3 border-t border-amarelo/60 space-y-3">
                  <p className="text-xs text-vermelho">
                    Isto apaga a OS #{String(ordem.id).padStart(5, '0')} com a linha do tempo e os anexos dela. Não
                    tem como desfazer. O veículo continua cadastrado. Digite a placa{' '}
                    <strong className="font-placa tabular-nums">{ordem.placa}</strong> para confirmar.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      value={placaConfirmacao}
                      onChange={(e) => setPlacaConfirmacao(e.target.value)}
                      placeholder={ordem.placa}
                      aria-label="Placa para confirmar a exclusão"
                      autoFocus
                      className="flex-1 bg-etiqueta border border-vermelho/40 rounded-xl px-3 py-2 text-xs font-placa tabular-nums uppercase text-grafite focus:outline-none focus:ring-2 focus:ring-vermelho"
                    />
                    <button
                      onClick={() => {
                        setConfirmandoExclusao(false);
                        setPlacaConfirmacao('');
                      }}
                      disabled={excluindo}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-grafite hover:bg-parede transition-all disabled:opacity-40 cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleExcluirOrdem}
                      disabled={excluindo || !placaConfere(placaConfirmacao)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-sobre-cor bg-vermelho hover:bg-vermelho/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5 justify-center"
                    >
                      {excluindo ? (
                        <div className="w-3.5 h-3.5 border-2 border-sobre-cor/30 border-t-sobre-cor rounded-full animate-spin" />
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
                <div className="bg-parede/60 p-4 rounded-xl border border-trilho">
                  <span className="text-xs text-aco uppercase font-semibold">Etapa Atual</span>
                  <p className="text-base font-bold text-grafite mt-1">
                    {ordem.etapaDescricao}
                  </p>
                </div>

                <div className="bg-parede/60 p-4 rounded-xl border border-trilho">
                  <span className="text-xs text-aco uppercase font-semibold">SLA / Pátio</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    {isAtrasado ? (
                      <AlertTriangle className="w-4 h-4 text-vermelho" />
                    ) : (
                      <Clock className="w-4 h-4 text-verde" />
                    )}
                    <span
                      className={`text-base font-placa tabular-nums font-bold ${
                        isAtrasado ? 'text-vermelho' : isAtencao ? 'text-amarelo-tinta' : 'text-verde'
                      }`}
                    >
                      {ordem.diasNoPatio} {ordem.diasNoPatio === 1 ? 'dia' : 'dias'}
                    </span>
                    <span className="text-xs text-aco">
                      ({ordem.statusSla === 'VERMELHO' ? 'Parado' : 'Dentro do prazo'})
                    </span>
                  </div>
                </div>

                <div className="bg-parede/60 p-4 rounded-xl border border-trilho">
                  <span className="text-xs text-aco uppercase font-semibold">Valor Orçado</span>
                  <p className="text-base font-placa tabular-nums font-bold text-verde mt-1">
                    {formatarMoeda(ordem.valorOrcamento)}
                  </p>
                </div>
              </div>

              {/* Informações detalhadas do veículo */}
              <div className="bg-parede/60 p-4 rounded-xl border border-trilho space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="text-xs font-bold text-grafite uppercase tracking-wider">
                    {editandoDados ? 'Corrigir dados da entrada' : 'Detalhes Operacionais'}
                  </h4>
                  {!editandoDados && (
                    <button
                      onClick={abrirEdicaoDados}
                      className="flex items-center gap-1.5 text-xs text-mercosul font-semibold px-3 py-1.5 rounded-lg bg-mercosul/10 border border-mercosul/40 hover:bg-mercosul/15 transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Editar dados</span>
                    </button>
                  )}
                </div>

                {editandoDados ? (
                  <form onSubmit={handleSalvarDados} className="space-y-3">
                    {erroDados && (
                      <div role="alert" className="p-3 bg-vermelho/10 border border-vermelho/40 rounded-xl text-vermelho text-xs flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0 text-vermelho mt-0.5" />
                        <span>{erroDados}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="detalhes-placa" className="block text-xs font-semibold text-grafite mb-1">
                          Placa *
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={7}
                          value={placaEdit}
                          id="detalhes-placa"
                          onChange={(e) =>
                            setPlacaEdit(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7))
                          }
                          aria-invalid={placaEdit.length > 0 && !placaEditValida}
                          autoFocus
                          className="w-full bg-etiqueta border border-trilho rounded-xl px-3 py-2 text-xs font-placa tabular-nums font-bold tracking-widest uppercase text-grafite focus:outline-none focus:ring-2 focus:ring-mercosul"
                        />
                        {placaEdit.length > 0 && !placaEditValida && (
                          <p className="text-[11px] text-vermelho mt-1">
                            Use o formato ABC1234 ou Mercosul (ABC1D23).
                          </p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="detalhes-modelo" className="block text-xs font-semibold text-grafite mb-1">
                          Modelo *
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={100}
                          value={modeloEdit}
                          id="detalhes-modelo"
                          onChange={(e) => setModeloEdit(e.target.value)}
                          className="w-full bg-etiqueta border border-trilho rounded-xl px-3 py-2 text-xs uppercase text-grafite focus:outline-none focus:ring-2 focus:ring-mercosul"
                        />
                      </div>

                      <div>
                        <label htmlFor="detalhes-origem" className="block text-xs font-semibold text-grafite mb-1">
                          Origem / Locadora
                        </label>
                        <select
                          value={origemEdit}
                          id="detalhes-origem"
                          onChange={(e) => setOrigemEdit(e.target.value)}
                          className="w-full bg-etiqueta border border-trilho rounded-xl px-3 py-2 text-xs text-grafite focus:outline-none focus:ring-2 focus:ring-mercosul"
                        >
                          <option value="">Não informada</option>
                          {origens.map((origem) => (
                            <option key={origem.id} value={origem.id}>
                              {origem.nome}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label htmlFor="detalhes-tipo-servico" className="block text-xs font-semibold text-grafite mb-1">
                          Tipo de Serviço
                        </label>
                        <select
                          value={tipoEdit}
                          id="detalhes-tipo-servico"
                          onChange={(e) => setTipoEdit(e.target.value)}
                          className="w-full bg-etiqueta border border-trilho rounded-xl px-3 py-2 text-xs text-grafite focus:outline-none focus:ring-2 focus:ring-mercosul"
                        >
                          <option value="">Geral (sem tipo)</option>
                          {tiposServico.map((tipo) => (
                            <option key={tipo.id} value={tipo.id}>
                              {tipo.nome}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <p className="text-[11px] text-aco">
                      Placa, modelo e origem são do veículo: a correção vale para todas as OS dele. O que mudar
                      fica registrado na Linha do Tempo.
                    </p>

                    <div className="flex items-center gap-2">
                      <button
                        type="submit"
                        disabled={salvandoDados || !placaEditValida || !modeloEdit.trim() || !dadosAlterados}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-sobre-cor bg-mercosul hover:bg-mercosul/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {salvandoDados ? 'Salvando...' : 'Salvar correção'}
                      </button>
                      <button
                        type="button"
                        onClick={cancelarEdicaoDados}
                        disabled={salvandoDados}
                        className="px-3 py-2 text-aco hover:text-grafite text-xs font-medium cursor-pointer disabled:opacity-40"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-aco block">Origem</span>
                      <span className="font-semibold text-grafite">{ordem.origemNome || 'Não informada'}</span>
                    </div>
                    <div>
                      <span className="text-aco block">Tipo de Serviço</span>
                      <span className="font-semibold text-mercosul">{ordem.tipoServicoNome || 'Geral'}</span>
                    </div>
                    <div>
                      <span className="text-aco block">Data de Entrada</span>
                      <span className="font-placa tabular-nums text-grafite">
                        {ordem.dataEntrada ? ordem.dataEntrada.split('-').reverse().join('/') : '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-aco block">Data de Saída</span>
                      <span className="font-placa tabular-nums text-grafite">
                        {ordem.dataSaida ? ordem.dataSaida.split('-').reverse().join('/') : 'Em aberto'}
                      </span>
                    </div>
                  </div>
                )}

                {ordem.observacoes && (
                  <div className="pt-2 border-t border-trilho">
                    <span className="text-aco block text-xs">Observações</span>
                    <p className="text-xs text-grafite mt-0.5 whitespace-pre-wrap">{ordem.observacoes}</p>
                  </div>
                )}
              </div>

              {/* Transição de Etapa Rápida (OS arquivada não muda de etapa) */}
              {ordem.ativo && (
                <div className="bg-parede/60 p-4 rounded-xl border border-trilho space-y-3">
                  <h4 className="text-xs font-bold text-grafite uppercase tracking-wider">
                    Alterar Etapa Operacional
                  </h4>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <select
                      value={novaEtapa}
                      onChange={(e) => setNovaEtapa(e.target.value as EtapaOrdemServico)}
                      aria-label="Nova etapa"
                      className="flex-1 bg-etiqueta border border-trilho rounded-xl px-3 py-2 text-xs text-grafite focus:outline-none focus:ring-2 focus:ring-mercosul"
                    >
                      {TODAS_ETAPAS.map((item) => (
                        <option key={item.etapa} value={item.etapa}>
                          {item.label}
                        </option>
                      ))}
                    </select>

                    {entregando && (
                      <div className="sm:w-44 flex flex-col gap-1">
                        <label htmlFor="detalhes-data-entrega" className="text-[11px] font-semibold text-aco">
                          Data de entrega
                        </label>
                        <input
                          type="date"
                          id="detalhes-data-entrega"
                          value={dataEntrega}
                          min={ordem.dataEntrada || undefined}
                          max={hoje}
                          onChange={(e) => setDataEntrega(e.target.value)}
                          aria-invalid={!dataEntregaValida}
                          className="bg-etiqueta border border-trilho rounded-xl px-3 py-2 text-xs font-placa tabular-nums text-grafite focus:outline-none focus:ring-2 focus:ring-mercosul"
                        />
                      </div>
                    )}

                    <input
                      type="text"
                      value={obsTransicao}
                      onChange={(e) => setObsTransicao(e.target.value)}
                      placeholder="Motivo ou nota da mudança (opcional)"
                      aria-label="Nota da mudança de etapa"
                      className="flex-1 bg-etiqueta border border-trilho rounded-xl px-3 py-2 text-xs text-grafite focus:outline-none focus:ring-2 focus:ring-mercosul"
                    />

                    <button
                      onClick={handleTransicionarEtapa}
                      disabled={salvandoTransicao || novaEtapa === ordem.etapa || (entregando && !dataEntregaValida)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-sobre-cor bg-mercosul hover:bg-mercosul/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5 justify-center"
                    >
                      {salvandoTransicao ? (
                        <div className="w-3.5 h-3.5 border-2 border-sobre-cor/30 border-t-sobre-cor rounded-full animate-spin" />
                      ) : (
                        <>
                          <span>Atualizar</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>

                  {entregando && !dataEntregaValida && (
                    <p role="alert" className="text-xs text-vermelho">
                      Escolha uma data entre a entrada do veículo e hoje.
                    </p>
                  )}
                  {entregaEmMesAnterior && (
                    <p className="text-xs text-amarelo-tinta">
                      Este veículo vai direto para o Histórico de{' '}
                      {rotuloMesLongo(Number(dataEntrega.slice(0, 4)), Number(dataEntrega.slice(5, 7)))}.
                    </p>
                  )}
                </div>
              )}

              {/* Arquivamento: tira a OS da operação sem apagar nada */}
              {ordem.ativo && (
                <div className="bg-parede/60 p-4 rounded-xl border border-trilho space-y-3">
                  {!confirmandoArquivamento ? (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <p className="text-xs text-aco">
                        Lançou errado ou o cliente desistiu? Arquive a OS: ela sai da operação, mas fica
                        guardada e pode ser restaurada no Histórico.
                      </p>
                      <button
                        onClick={() => setConfirmandoArquivamento(true)}
                        className="shrink-0 px-4 py-2 rounded-xl text-xs font-bold text-amarelo-tinta border border-amarelo/60 hover:bg-amarelo/15 transition-all cursor-pointer flex items-center gap-1.5 justify-center"
                      >
                        <Archive className="w-3.5 h-3.5" />
                        <span>Arquivar OS</span>
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs text-grafite">
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
                          className="flex-1 bg-etiqueta border border-trilho rounded-xl px-3 py-2 text-xs text-grafite focus:outline-none focus:ring-2 focus:ring-amarelo"
                        />
                        <button
                          onClick={() => {
                            setConfirmandoArquivamento(false);
                            setMotivoArquivamento('');
                          }}
                          disabled={salvandoArquivamento}
                          className="px-4 py-2 rounded-xl text-xs font-semibold text-grafite hover:bg-parede transition-all disabled:opacity-40 cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => handleAlterarArquivamento(true)}
                          disabled={salvandoArquivamento || !motivoArquivamento.trim()}
                          className="px-4 py-2 rounded-xl text-xs font-bold text-sobre-cor bg-amarelo-tinta hover:bg-amarelo-tinta/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5 justify-center"
                        >
                          {salvandoArquivamento ? (
                            <div className="w-3.5 h-3.5 border-2 border-sobre-cor/30 border-t-sobre-cor rounded-full animate-spin" />
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
              <div className="bg-parede/60 p-5 rounded-2xl border border-trilho space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-grafite">Valor Orçado da OS</h4>
                    <p className="text-xs text-aco">
                      Toda alteração de valor é registrada na linha do tempo de auditoria
                    </p>
                  </div>
                  {!editandoOrcamento && (
                    <button
                      onClick={() => setEditandoOrcamento(true)}
                      className="flex items-center gap-1.5 text-xs text-mercosul hover:text-mercosul font-semibold px-3 py-1.5 rounded-lg bg-mercosul/10 border border-mercosul/40"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Alterar Valor</span>
                    </button>
                  )}
                </div>

                {!editandoOrcamento ? (
                  <div className="text-2xl font-placa tabular-nums font-bold text-verde">
                    {formatarMoeda(ordem.valorOrcamento)}
                  </div>
                ) : (
                  <form onSubmit={handleSalvarOrcamento} className="space-y-3 pt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="detalhes-novo-valor" className="block text-xs font-semibold text-grafite mb-1">
                          Novo Valor (R$) *
                        </label>
                        <input
                          type="text"
                          required
                          value={novoValor}
                          id="detalhes-novo-valor"
                          onChange={(e) => setNovoValor(e.target.value)}
                          placeholder="Ex: 1500.00"
                          className="w-full bg-etiqueta border border-trilho rounded-xl px-3 py-2 text-xs font-placa tabular-nums font-bold text-grafite focus:outline-none focus:ring-2 focus:ring-mercosul"
                        />
                      </div>
                      <div>
                        <label htmlFor="detalhes-justificativa" className="block text-xs font-semibold text-grafite mb-1">
                          Justificativa da Mudança (Opcional)
                        </label>
                        <input
                          type="text"
                          value={justificativaOrcamento}
                          id="detalhes-justificativa"
                          onChange={(e) => setJustificativaOrcamento(e.target.value)}
                          placeholder="Ex: Adição de peças ou mão de obra extra"
                          className="w-full bg-etiqueta border border-trilho rounded-xl px-3 py-2 text-xs text-grafite focus:outline-none focus:ring-2 focus:ring-mercosul"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="submit"
                        disabled={salvandoOrcamento}
                        className="px-4 py-1.5 bg-verde hover:bg-verde/90 text-sobre-cor rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                      >
                        {salvandoOrcamento ? 'Salvando...' : 'Salvar Novo Valor'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditandoOrcamento(false)}
                        className="px-3 py-1.5 text-aco hover:text-grafite text-xs font-medium"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Status de Faturamento */}
              <div className="bg-parede/60 p-5 rounded-2xl border border-trilho space-y-4">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-verde" />
                  <h4 className="text-sm font-bold text-grafite">Status de Faturamento</h4>
                </div>

                <form onSubmit={handleSalvarFaturamento} className="space-y-4">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-grafite">
                      <input
                        type="checkbox"
                        checked={faturado}
                        onChange={(e) => setFaturado(e.target.checked)}
                        className="rounded border-trilho text-verde focus:ring-verde bg-etiqueta w-4 h-4"
                      />
                      <span>Ordem de Serviço Faturada</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="detalhes-data-faturamento" className="block text-xs font-semibold text-grafite mb-1">
                        Data de Faturamento
                      </label>
                      <input
                        type="date"
                        value={dataFaturamento}
                        id="detalhes-data-faturamento"
                        onChange={(e) => setDataFaturamento(e.target.value)}
                        className="w-full bg-etiqueta border border-trilho rounded-xl px-3 py-2 text-xs font-placa tabular-nums text-grafite focus:outline-none focus:ring-2 focus:ring-mercosul"
                      />
                    </div>

                    <div>
                      <label htmlFor="detalhes-numero-nf" className="block text-xs font-semibold text-grafite mb-1">
                        Número da Nota Fiscal (NF)
                      </label>
                      <input
                        type="text"
                        value={numeroNf}
                        id="detalhes-numero-nf"
                        onChange={(e) => setNumeroNf(e.target.value)}
                        placeholder="Ex: NF-2026-0045"
                        className="w-full bg-etiqueta border border-trilho rounded-xl px-3 py-2 text-xs text-grafite focus:outline-none focus:ring-2 focus:ring-mercosul"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={salvandoFaturamento}
                    className="px-4 py-2 bg-mercosul hover:bg-mercosul/90 text-sobre-cor rounded-xl text-xs font-bold transition-all disabled:opacity-50"
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
                <h4 className="text-xs font-bold text-grafite uppercase tracking-wider">
                  Linha do Tempo Completa de Auditoria
                </h4>
                <span className="text-[11px] text-aco font-placa tabular-nums">
                  Registros imutáveis
                </span>
              </div>

              {carregandoHistorico ? (
                <div className="py-12 text-center text-aco">
                  <div className="w-6 h-6 border-2 border-mercosul border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-xs">Carregando histórico...</p>
                </div>
              ) : historico.length === 0 ? (
                <div className="py-8 text-center text-aco text-xs">
                  Nenhum registro histórico encontrado.
                </div>
              ) : (
                <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-parede">
                  {historico.map((h) => (
                    <div key={h.id} className="relative group">
                      {/* Ponto na timeline */}
                      <span className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-mercosul border-2 border-trilho group-hover:scale-125 transition-transform" />

                      <div className="bg-parede/60 p-3.5 rounded-xl border border-trilho space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-grafite">
                            {h.etapaAnteriorDescricao
                              ? `${h.etapaAnteriorDescricao} → ${h.etapaNovaDescricao}`
                              : `Etapa: ${h.etapaNovaDescricao}`}
                          </span>
                          <span className="text-[11px] font-placa tabular-nums text-aco">
                            {formatarDataHora(h.dataHora)}
                          </span>
                        </div>

                        {h.observacao && (
                          <p className="text-xs text-grafite italic">{h.observacao}</p>
                        )}

                        <div className="flex items-center justify-between pt-1 text-[11px] text-aco border-t border-trilho">
                          <span>Responsável: {h.usuarioNome}</span>
                          <span className="font-placa tabular-nums text-aco">
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
              <div className="border-2 border-dashed border-trilho hover:border-mercosul has-[:focus-visible]:border-mercosul has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-mercosul rounded-2xl p-6 text-center transition-colors">
                <input
                  type="file"
                  id="file-upload"
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.doc,.docx,.xls,.xlsx,.txt"
                  onChange={handleUploadArquivo}
                  disabled={enviandoAnexo}
                  className="sr-only"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer flex flex-col items-center justify-center space-y-2"
                >
                  <div className="w-10 h-10 rounded-full bg-mercosul/10 border border-mercosul/40 flex items-center justify-center text-mercosul">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-mercosul hover:underline">
                      Clique para enviar um arquivo
                    </span>
                    <span className="text-xs text-aco block mt-0.5">
                      Fotos de avarias, ordens assinadas, PDFs de vistoria (até 8MB)
                    </span>
                  </div>
                </label>
                {enviandoAnexo && (
                  <p role="status" className="text-xs text-mercosul mt-2 font-medium">Enviando anexo...</p>
                )}
              </div>

              {/* Lista de Arquivos */}
              <div className="space-y-2">
                {anexos.length === 0 ? (
                  <p className="text-center py-6 text-xs text-aco">
                    Nenhum anexo registrado para esta ordem de serviço.
                  </p>
                ) : (
                  anexos.map((anexo) => (
                    <div
                      key={anexo.id}
                      className="bg-parede/60 p-3 rounded-xl border border-trilho flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <Paperclip className="w-4 h-4 text-aco shrink-0" />
                        <div className="truncate">
                          <span className="font-semibold text-grafite block truncate">
                            {anexo.nomeArquivo}
                          </span>
                          <span className="text-[10px] text-aco">
                            {(anexo.tamanhoBytes / 1024).toFixed(1)} KB &bull; {anexo.usuarioNome}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleBaixarAnexo(anexo.id, anexo.nomeArquivo)}
                          className="p-1.5 text-aco hover:text-mercosul hover:bg-parede rounded-lg transition-colors"
                          title="Baixar arquivo"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleExcluirAnexo(anexo.id)}
                          className="p-1.5 text-aco hover:text-vermelho hover:bg-parede rounded-lg transition-colors"
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
