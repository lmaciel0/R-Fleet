export type EtapaOrdemServico =
  | 'AGUARDANDO_ORCAMENTO'
  | 'ORCAMENTO'
  | 'APROVADO'
  | 'EM_SERVICO'
  | 'FINALIZADO'
  | 'AGUARDANDO_RETIRADA'
  | 'ENTREGUE';

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  ativo: boolean;
}

export interface Origem {
  id: number;
  nome: string;
  ativo: boolean;
}

export interface TipoServico {
  id: number;
  nome: string;
  ativo: boolean;
}

export interface OrdemServico {
  id: number;
  veiculoId: number;
  placa: string;
  placaFormatada: string;
  modelo: string;
  mercosul: boolean;
  origemId?: number;
  origemNome?: string;
  tipoServicoId?: number;
  tipoServicoNome?: string;
  etapa: EtapaOrdemServico;
  etapaDescricao: string;
  servicoConcluido: boolean;
  valorOrcamento: number;
  faturado: boolean;
  dataFaturamento?: string;
  numeroNf?: string;
  dataEntrada: string;
  dataSaida?: string;
  diasNoPatio: number;
  statusSla: 'VERDE' | 'AMARELO' | 'VERMELHO';
  observacoes?: string;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

export interface HistoricoEtapa {
  id: number;
  ordemServicoId: number;
  etapaAnterior?: EtapaOrdemServico;
  etapaAnteriorDescricao?: string;
  etapaNova: EtapaOrdemServico;
  etapaNovaDescricao: string;
  usuarioNome: string;
  usuarioEmail: string;
  valorOrcamentoMomento: number;
  observacao?: string;
  dataHora: string;
}

export interface AnexoOs {
  id: number;
  ordemServicoId: number;
  nomeArquivo: string;
  tipoConteudo: string;
  tamanhoBytes: number;
  usuarioNome: string;
  criadoEm: string;
}

export interface DashboardMetricas {
  totalVeiculosPatio: number;
  veiculosEmAtraso: number;
  tempoMedioPatioDias: number;
  faturamentoMesAtual: number;
  totalOrcadoPatio: number;
  totalFaturadoGeral: number;
  totalFaturadas: number;
  totalNaoFaturadas: number;
  limiteSlaDias: number;
  distribuicaoPorEtapa: Record<EtapaOrdemServico, number>;
  distribuicaoPorOrigem: Record<string, number>;
}

export interface BuscarPlacaResultado {
  encontrado: boolean;
  placa: string;
  placaFormatada: string;
  mercosul: boolean;
  modelo?: string;
  origemId?: number;
  origemNome?: string;
  possuiOsAtiva: boolean;
  ordemServicoAtivaId?: number;
  etapaAtiva?: EtapaOrdemServico;
  etapaAtivaDescricao?: string;
}

export interface ImportacaoResultado {
  totalLinhasLidas: number;
  totalImportadas: number;
  totalIgnoradas: number;
  totalErros: number;
  mensagens: string[];
}
