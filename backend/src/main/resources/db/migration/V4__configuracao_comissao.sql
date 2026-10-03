-- =========================================================================
-- V4: Percentual da comissão mensal sobre o valor faturado no mês
-- =========================================================================

INSERT INTO configuracoes (chave, valor, descricao) VALUES
    ('COMISSAO_PERCENTUAL', '2', 'Percentual de comissão mensal sobre o valor faturado no mês')
ON CONFLICT (chave) DO NOTHING;
