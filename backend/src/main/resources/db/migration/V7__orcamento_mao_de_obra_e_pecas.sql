-- =========================================================================
-- V7: Orçamento desmembrado em mão de obra e peças; comissão de 1% sobre cada uma
-- valor_orcamento continua existindo e passa a ser sempre mão de obra + peças.
-- As OS que já existem levam o valor inteiro para mão de obra e peças = 0.
-- =========================================================================

ALTER TABLE ordens_servico
    ADD COLUMN valor_mao_de_obra NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN valor_pecas NUMERIC(12, 2) NOT NULL DEFAULT 0.00;

UPDATE ordens_servico SET valor_mao_de_obra = valor_orcamento, valor_pecas = 0.00;

INSERT INTO configuracoes (chave, valor, descricao) VALUES
    ('COMISSAO_PERCENTUAL_MAO_DE_OBRA', '1', 'Percentual de comissão mensal sobre a mão de obra faturada no mês'),
    ('COMISSAO_PERCENTUAL_PECAS', '1', 'Percentual de comissão mensal sobre as peças faturadas no mês')
ON CONFLICT (chave) DO NOTHING;

DELETE FROM configuracoes WHERE chave = 'COMISSAO_PERCENTUAL';
