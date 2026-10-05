import {
  AnexoOs,
  BuscarPlacaResultado,
  DashboardMetricas,
  FaturamentoMes,
  EtapaOrdemServico,
  HistoricoEtapa,
  HistoricoMes,
  ImportacaoResultado,
  OrdemServico,
  Origem,
  TipoServico,
  Usuario,
} from '../types';

const API_BASE = '/api';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/**
 * Converte um id (que pode vir de uma resposta da API) num segmento de URL seguro:
 * só aceita inteiro positivo, o que impede que um valor adulterado mude o caminho da requisição.
 */
function idNaUrl(id: number): string {
  const numero = Number(id);
  if (!Number.isSafeInteger(numero) || numero <= 0) {
    throw new ApiError('Identificador inválido.', 400);
  }
  return encodeURIComponent(String(numero));
}

function getToken(): string | null {
  return sessionStorage.getItem('rfleet_token');
}

/**
 * Lança o erro de uma resposta não-OK, igual para JSON e downloads. Um 401 só encerra a sessão
 * quando havia uma sessão; no login, 401 é "e-mail ou senha inválidos" e a mensagem do backend vale.
 */
async function lancarErroDaResposta(response: Response, sessaoAtiva: boolean): Promise<never> {
  if (response.status === 401 && sessaoAtiva) {
    sessionStorage.removeItem('rfleet_token');
    sessionStorage.removeItem('rfleet_user');
    window.dispatchEvent(new Event('auth:unauthorized'));
    throw new ApiError('Sessão expirada. Faça login novamente.', 401);
  }

  let errorMsg = `Erro na requisição (${response.status})`;
  try {
    const errorData = await response.json();
    if (errorData.mensagem) {
      errorMsg = errorData.mensagem;
    } else if (errorData.errors && Array.isArray(errorData.errors)) {
      errorMsg = errorData.errors.map((e: any) => e.mensagem || e).join(', ');
    }
  } catch {
    // Ignora erro de parse de JSON
  }
  throw new ApiError(errorMsg, response.status);
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 204) {
    return {} as T;
  }

  if (!response.ok) {
    await lancarErroDaResposta(response, Boolean(token) && endpoint !== '/auth/login');
  }

  return response.json();
}

// Caracteres aceitos na busca por placa/modelo (inclui acentos do português)
const CARACTERES_DA_BUSCA =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzÁÀÂÃÉÊÍÓÔÕÚÇáàâãéêíóôõúç0123456789 .-/';

/** Busca reconstruída só com caracteres da lista acima (cada um copiado da constante), até 100. */
function termoDeBusca(valor: unknown): string {
  let termo = '';
  for (const caractere of typeof valor === 'string' ? valor : '') {
    const posicao = CARACTERES_DA_BUSCA.indexOf(caractere);
    if (posicao >= 0) termo += CARACTERES_DA_BUSCA.charAt(posicao);
    if (termo.length >= 100) break;
  }
  return termo.trim();
}

const ETAPAS_VALIDAS: EtapaOrdemServico[] = [
  'AGUARDANDO_ORCAMENTO',
  'ORCAMENTO',
  'APROVADO',
  'EM_SERVICO',
  'FINALIZADO',
  'AGUARDANDO_RETIRADA',
  'ENTREGUE',
];

/**
 * Query da exportação montada só com valores validados: etapas da lista conhecida, ids inteiros,
 * sim/não, datas remontadas a partir de números e busca com caracteres permitidos.
 * Nada vindo da tela vai cru para a URL da requisição.
 */
function queryDeExportacao(formato: 'xlsx' | 'csv', filtros: Record<string, any>): string {
  const partes: string[] = [`formato=${formato === 'csv' ? 'csv' : 'xlsx'}`];
  const adicionar = (chave: string, valor: string) => partes.push(`${chave}=${encodeURIComponent(valor)}`);

  const etapas: unknown[] = Array.isArray(filtros.etapas) ? filtros.etapas : [];
  etapas.forEach((valor) => {
    const etapa = ETAPAS_VALIDAS.find((conhecida) => conhecida === valor);
    if (etapa) adicionar('etapas', etapa);
  });

  for (const chave of ['origemId', 'tipoServicoId']) {
    const numero = Number(filtros[chave]);
    if (filtros[chave] !== undefined && filtros[chave] !== '' && Number.isSafeInteger(numero) && numero > 0) {
      adicionar(chave, String(numero));
    }
  }

  for (const chave of ['faturado', 'concluido', 'emAtraso', 'ocultarEntreguesAnteriores', 'ativo']) {
    if (filtros[chave] === true || filtros[chave] === 'true') adicionar(chave, 'true');
    else if (filtros[chave] === false || filtros[chave] === 'false') adicionar(chave, 'false');
  }

  for (const chave of ['dataEntradaInicio', 'dataEntradaFim', 'dataSaidaInicio', 'dataSaidaFim']) {
    const data = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(filtros[chave] ?? ''));
    if (data) {
      const [ano, mes, dia] = [Number(data[1]), Number(data[2]), Number(data[3])];
      adicionar(chave, `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`);
    }
  }

  const termo = termoDeBusca(filtros.termo);
  if (termo) adicionar('termo', termo);

  return partes.join('&');
}

/** Nome do arquivo do Content-Disposition (filename* em UTF-8 tem prioridade). */
function nomeDoArquivo(contentDisposition: string | null, nomePadrao: string): string {
  if (!contentDisposition) return nomePadrao;
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(contentDisposition);
  if (utf8) {
    try {
      return decodeURIComponent(utf8[1].trim());
    } catch {
      // segue para o filename simples
    }
  }
  const simples = /filename="([^"]+)"/i.exec(contentDisposition);
  return simples ? simples[1] : nomePadrao;
}

/** Baixa um arquivo autenticado pelo cabeçalho (o token nunca vai na URL). */
async function baixarArquivo(endpoint: string, nomePadrao: string): Promise<void> {
  const token = getToken();
  const headers = new Headers();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, { headers });
  if (!response.ok) {
    await lancarErroDaResposta(response, Boolean(token));
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeDoArquivo(response.headers.get('Content-Disposition'), nomePadrao);
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export const api = {
  // Auth
  async login(email: string, senha: string): Promise<{ token: string; usuario: Usuario }> {
    return request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, senha }),
    });
  },

  async getMe(): Promise<Usuario> {
    return request('/auth/me');
  },

  // Auxiliares
  async listarOrigens(): Promise<Origem[]> {
    return request('/origens');
  },

  async listarTiposServico(): Promise<TipoServico[]> {
    return request('/tipos-servico');
  },

  async buscarPlaca(placa: string): Promise<BuscarPlacaResultado> {
    const sanitizada = placa.replace(/[^a-zA-Z0-9]/g, '');
    return request(`/veiculos/buscar-placa/${sanitizada}`);
  },

  // Ordens de Serviço
  async listarOrdens(filtros: Record<string, any> = {}): Promise<OrdemServico[]> {
    const params = new URLSearchParams();
    Object.entries(filtros).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        if (Array.isArray(val)) {
          val.forEach((item) => params.append(key, item));
        } else {
          params.append(key, String(val));
        }
      }
    });
    const qs = params.toString();
    return request(`/ordens-servico${qs ? `?${qs}` : ''}`);
  },

  async obterOrdem(id: number): Promise<OrdemServico> {
    return request(`/ordens-servico/${idNaUrl(id)}`);
  },

  async listarMesesHistorico(): Promise<HistoricoMes[]> {
    return request('/historico/meses');
  },

  async registrarEntrada(dados: {
    placa: string;
    modelo: string;
    origemId?: number;
    tipoServicoId?: number;
    etapa?: string;
    valorOrcamento?: number;
    dataEntrada?: string;
    observacoes?: string;
  }): Promise<OrdemServico> {
    return request('/ordens-servico', {
      method: 'POST',
      body: JSON.stringify(dados),
    });
  },

  async transicionarEtapa(id: number, novaEtapa: string, observacao?: string): Promise<OrdemServico> {
    return request(`/ordens-servico/${idNaUrl(id)}/etapa`, {
      method: 'PATCH',
      body: JSON.stringify({ novaEtapa, observacao }),
    });
  },

  async atualizarOrcamento(id: number, valor: number, justificativa?: string): Promise<OrdemServico> {
    return request(`/ordens-servico/${idNaUrl(id)}/orcamento`, {
      method: 'PATCH',
      body: JSON.stringify({ valor, justificativa }),
    });
  },

  async atualizarFaturamento(
    id: number,
    faturado: boolean,
    dataFaturamento?: string,
    numeroNf?: string
  ): Promise<OrdemServico> {
    return request(`/ordens-servico/${idNaUrl(id)}/faturamento`, {
      method: 'PATCH',
      body: JSON.stringify({ faturado, dataFaturamento, numeroNf }),
    });
  },

  async obterHistorico(id: number): Promise<HistoricoEtapa[]> {
    return request(`/ordens-servico/${idNaUrl(id)}/historico`);
  },

  // Arquiva (motivo obrigatório) ou restaura a OS; a mudança fica na linha do tempo
  async alterarArquivamento(id: number, arquivada: boolean, motivo?: string): Promise<OrdemServico> {
    return request(`/ordens-servico/${idNaUrl(id)}/arquivamento`, {
      method: 'PATCH',
      body: JSON.stringify({ arquivada, motivo }),
    });
  },

  // Exclusão definitiva: a API só aceita OS arquivada
  async excluirOrdem(id: number): Promise<void> {
    return request(`/ordens-servico/${idNaUrl(id)}`, {
      method: 'DELETE',
    });
  },

  // Anexos
  async listarAnexos(ordemServicoId: number): Promise<AnexoOs[]> {
    return request(`/ordens-servico/${idNaUrl(ordemServicoId)}/anexos`);
  },

  async uploadAnexo(ordemServicoId: number, arquivo: File): Promise<AnexoOs> {
    const formData = new FormData();
    formData.append('arquivo', arquivo);
    return request(`/ordens-servico/${idNaUrl(ordemServicoId)}/anexos`, {
      method: 'POST',
      body: formData,
    });
  },

  async excluirAnexo(id: number): Promise<void> {
    return request(`/anexos/${idNaUrl(id)}`, {
      method: 'DELETE',
    });
  },

  async baixarAnexo(id: number, nomeArquivo: string): Promise<void> {
    return baixarArquivo(`/anexos/${idNaUrl(id)}/download`, nomeArquivo);
  },

  // Dashboard
  async obterMetricas(dataReferencia?: string): Promise<DashboardMetricas> {
    const qs = dataReferencia ? `?dataReferencia=${encodeURIComponent(dataReferencia)}` : '';
    return request(`/dashboard/metricas${qs}`);
  },

  async obterFaturamentoMes(ano: number, mes: number): Promise<FaturamentoMes> {
    return request(`/dashboard/faturamento?ano=${encodeURIComponent(ano)}&mes=${encodeURIComponent(mes)}`);
  },

  // Importação e Exportação
  async importarPlanilha(arquivo: File): Promise<ImportacaoResultado> {
    const formData = new FormData();
    formData.append('arquivo', arquivo);
    return request('/importacao/planilha', {
      method: 'POST',
      body: formData,
    });
  },

  async exportarOrdens(formato: 'xlsx' | 'csv', filtros: Record<string, any> = {}): Promise<void> {
    return baixarArquivo(
      `/exportacao/ordens-servico?${queryDeExportacao(formato, filtros)}`,
      `rfleet_ordens.${formato === 'csv' ? 'csv' : 'xlsx'}`
    );
  },
};
