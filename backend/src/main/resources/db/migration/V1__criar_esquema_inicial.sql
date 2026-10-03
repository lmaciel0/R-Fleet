-- =========================================================================
-- V1: Esquema Inicial do Banco de Dados R-Fleet
-- =========================================================================

-- 1. Tabela de Usuários (Gestor do Sistema)
CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabela de Origens de Veículos
CREATE TABLE origens (
    id BIGSERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabela de Tipos de Serviço
CREATE TABLE tipos_servico (
    id BIGSERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabela de Veículos (Cadastro Durável)
CREATE TABLE veiculos (
    id BIGSERIAL PRIMARY KEY,
    placa VARCHAR(10) NOT NULL UNIQUE,
    modelo VARCHAR(100) NOT NULL,
    origem_padrao_id BIGINT REFERENCES origens(id) ON DELETE SET NULL,
    criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_veiculos_placa ON veiculos(placa);

-- 5. Tabela de Ordens de Serviço (Passagem pela Oficina)
CREATE TABLE ordens_servico (
    id BIGSERIAL PRIMARY KEY,
    veiculo_id BIGINT NOT NULL REFERENCES veiculos(id) ON DELETE CASCADE,
    tipo_servico_id BIGINT REFERENCES tipos_servico(id) ON DELETE SET NULL,
    etapa VARCHAR(30) NOT NULL DEFAULT 'AGUARDANDO_ORCAMENTO',
    valor_orcamento NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    faturado BOOLEAN NOT NULL DEFAULT FALSE,
    data_faturamento DATE NULL,
    numero_nf VARCHAR(50) NULL,
    data_entrada DATE NOT NULL DEFAULT CURRENT_DATE,
    data_saida DATE NULL,
    observacoes TEXT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Constraint parcial única: Um veículo não pode ter mais de uma OS em aberto
CREATE UNIQUE INDEX idx_os_veiculo_ativo_unica 
ON ordens_servico (veiculo_id) 
WHERE etapa <> 'ENTREGUE' AND ativo = true;

-- Índices de consulta rápida
CREATE INDEX idx_os_etapa ON ordens_servico(etapa);
CREATE INDEX idx_os_data_entrada ON ordens_servico(data_entrada);
CREATE INDEX idx_os_ativo ON ordens_servico(ativo);

-- 6. Tabela de Histórico de Etapas (Linha do Tempo Imutável)
CREATE TABLE historico_etapas (
    id BIGSERIAL PRIMARY KEY,
    ordem_servico_id BIGINT NOT NULL REFERENCES ordens_servico(id) ON DELETE CASCADE,
    etapa_anterior VARCHAR(30) NULL,
    etapa_nova VARCHAR(30) NOT NULL,
    usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    valor_orcamento_momento NUMERIC(12, 2) NULL,
    observacao TEXT NULL,
    data_hora TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_historico_os_id ON historico_etapas(ordem_servico_id);

-- 7. Tabela de Anexos das Ordens de Serviço
CREATE TABLE anexos_os (
    id BIGSERIAL PRIMARY KEY,
    ordem_servico_id BIGINT NOT NULL REFERENCES ordens_servico(id) ON DELETE CASCADE,
    nome_arquivo VARCHAR(255) NOT NULL,
    tipo_conteudo VARCHAR(100) NOT NULL,
    tamanho_bytes BIGINT NOT NULL,
    caminho_storage VARCHAR(500) NOT NULL,
    usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_anexos_os_id ON anexos_os(ordem_servico_id);

-- 8. Tabela de Configurações Gerais do Sistema
CREATE TABLE configuracoes (
    chave VARCHAR(100) PRIMARY KEY,
    valor VARCHAR(255) NOT NULL,
    descricao VARCHAR(255) NULL
);
