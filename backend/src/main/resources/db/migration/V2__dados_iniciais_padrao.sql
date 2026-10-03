-- =========================================================================
-- V2: Carga Inicial de Dados Padrão (Origens, Serviços, Configurações e Gestor)
-- =========================================================================

-- 1. Origens Padrão do Sistema
INSERT INTO origens (nome, ativo) VALUES
    ('Cliente', true),
    ('Oficina', true),
    ('Concessionária', true),
    ('Seguradora', true),
    ('Movida', true),
    ('Unidas', true),
    ('Outro', true)
ON CONFLICT (nome) DO NOTHING;

-- 2. Tipos de Serviço Padrão
INSERT INTO tipos_servico (nome, ativo) VALUES
    ('Mecânica', true),
    ('Funilaria', true)
ON CONFLICT (nome) DO NOTHING;

-- 3. Parâmetros de Configuração
INSERT INTO configuracoes (chave, valor, descricao) VALUES
    ('LIMITE_DIAS_ALERTA_PARADO', '15', 'Limite de dias parado na oficina para disparo de alerta visual (vermelho)')
ON CONFLICT (chave) DO NOTHING;

-- 4. Usuário Gestor Inicial Padrão (senha: senha-de-teste)
INSERT INTO usuarios (id, nome, email, senha_hash, ativo) VALUES
    (
        'a0000000-0000-0000-0000-000000000001',
        'Gestor da Oficina',
        'gestor@rfleet.com.br',
        '$2a$10$FeVd0gtoDE/NIkoiwJui1.8ZlJgB/unDnyAevcNoQ6bw/hg5oDbXO',
        true
    )
ON CONFLICT (email) DO NOTHING;
