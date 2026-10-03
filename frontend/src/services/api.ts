import {
  AnexoOs,
  BuscarPlacaResultado,
  DashboardMetricas,
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
  return localStorage.getItem('rfleet_token');
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

  if (response.status === 401) {
    localStorage.removeItem('rfleet_token');
    localStorage.removeItem('rfleet_user');
    window.dispatchEvent(new Event('auth:unauthorized'));
    throw new ApiError('Sessão expirada. Faça login novamente.', 401);
  }

  if (response.status === 204) {
    return {} as T;
  }

  if (!response.ok) {
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

  return response.json();
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

  async arquivarOrdem(id: number): Promise<void> {
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

  downloadAnexoUrl(id: number): string {
    const token = getToken();
    return `${API_BASE}/anexos/${idNaUrl(id)}/download${token ? `?token=${encodeURIComponent(token)}` : ''}`;
  },

  // Dashboard
  async obterMetricas(dataReferencia?: string): Promise<DashboardMetricas> {
    const qs = dataReferencia ? `?dataReferencia=${encodeURIComponent(dataReferencia)}` : '';
    return request(`/dashboard/metricas${qs}`);
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

  exportarOrdensUrl(formato: 'xlsx' | 'csv', filtros: Record<string, any> = {}): string {
    const token = getToken();
    const params = new URLSearchParams();
    params.set('formato', formato);
    if (token) {
      params.set('token', token);
    }
    Object.entries(filtros).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        if (Array.isArray(val)) {
          val.forEach((item) => params.append(key, item));
        } else {
          params.append(key, String(val));
        }
      }
    });
    return `${API_BASE}/exportacao/ordens-servico?${params.toString()}`;
  },
};
