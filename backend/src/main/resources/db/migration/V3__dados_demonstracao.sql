-- ========================================================================
-- R-Fleet - Migration V3: Dados de Demonstração e Pátio Inicial
-- Popula veículos e ordens de serviço cobrindo todos os estágios do Kanban,
-- incluindo veículo em atraso (> 5 dias), veículos faturados e orçamento.
-- ========================================================================

-- Inserir Veículos de Demonstração (apenas se não existirem)
INSERT INTO veiculos (placa, modelo, origem_padrao_id)
VALUES 
    ('DEM0J00', 'CHEVROLET TRACKER 1.2 TURBO', 5),
    ('DEM1A01', 'TOYOTA COROLLA CROSS 2.0', 1),
    ('DEM2B02', 'JEEP COMPASS LONGITUDE', 6),
    ('DEM3C03', 'VOLKSWAGEN T-CROSS HIGHLINE', 4),
    ('DEM4D04', 'FIAT TORO RANCH DIESEL', 2),
    ('DEM5E05', 'HYUNDAI CRETA PLATINUM', 5),
    ('DEM6F06', 'RENAULT DUSTER INTENSE', 3),
    ('DEM7G07', 'FIAT STRADA FREEDOM', 6),
    ('DEM8H08', 'NISSAN KICKS ADVANCE', 1),
    ('DEM9I09', 'PEUGEOT 208 GRIFFE', 7)
ON CONFLICT (placa) DO NOTHING;

-- Inserir Ordens de Serviço cobrindo as 7 etapas
DO $$
DECLARE
    v_tracker_id BIGINT;
    v_corolla_id BIGINT;
    v_compass_id BIGINT;
    v_tcross_id BIGINT;
    v_toro_id BIGINT;
    v_creta_id BIGINT;
    v_duster_id BIGINT;
    v_strada_id BIGINT;
    v_kicks_id BIGINT;
    v_208_id BIGINT;
    v_user_id UUID := 'a0000000-0000-0000-0000-000000000001';
    v_os_id BIGINT;
BEGIN
    SELECT id INTO v_tracker_id FROM veiculos WHERE placa = 'DEM0J00';
    SELECT id INTO v_corolla_id FROM veiculos WHERE placa = 'DEM1A01';
    SELECT id INTO v_compass_id FROM veiculos WHERE placa = 'DEM2B02';
    SELECT id INTO v_tcross_id FROM veiculos WHERE placa = 'DEM3C03';
    SELECT id INTO v_toro_id FROM veiculos WHERE placa = 'DEM4D04';
    SELECT id INTO v_creta_id FROM veiculos WHERE placa = 'DEM5E05';
    SELECT id INTO v_duster_id FROM veiculos WHERE placa = 'DEM6F06';
    SELECT id INTO v_strada_id FROM veiculos WHERE placa = 'DEM7G07';
    SELECT id INTO v_kicks_id FROM veiculos WHERE placa = 'DEM8H08';
    SELECT id INTO v_208_id FROM veiculos WHERE placa = 'DEM9I09';

    -- 1. Aguardando Orçamento (Tracker - Movida)
    IF NOT EXISTS (SELECT 1 FROM ordens_servico WHERE veiculo_id = v_tracker_id) THEN
        INSERT INTO ordens_servico (veiculo_id, tipo_servico_id, etapa, valor_orcamento, faturado, data_entrada, observacoes)
        VALUES (v_tracker_id, 1, 'AGUARDANDO_ORCAMENTO', 0.00, false, CURRENT_DATE, 'Veículo chegou guinchado com ruído no motor.')
        RETURNING id INTO v_os_id;

        INSERT INTO historico_etapas (ordem_servico_id, etapa_anterior, etapa_nova, usuario_id, valor_orcamento_momento, observacao)
        VALUES (v_os_id, NULL, 'AGUARDANDO_ORCAMENTO', v_user_id, 0.00, 'Entrada inicial do veículo na oficina');
    END IF;

    -- 2. Orçamento (Corolla Cross - Cliente)
    IF NOT EXISTS (SELECT 1 FROM ordens_servico WHERE veiculo_id = v_corolla_id) THEN
        INSERT INTO ordens_servico (veiculo_id, tipo_servico_id, etapa, valor_orcamento, faturado, data_entrada, observacoes)
        VALUES (v_corolla_id, 1, 'ORCAMENTO', 1450.00, false, CURRENT_DATE - INTERVAL '2 days', 'Troca de pastilhas dianteiras e revisão de 40.000 km.')
        RETURNING id INTO v_os_id;

        INSERT INTO historico_etapas (ordem_servico_id, etapa_anterior, etapa_nova, usuario_id, valor_orcamento_momento, observacao)
        VALUES (v_os_id, NULL, 'AGUARDANDO_ORCAMENTO', v_user_id, 0.00, 'Entrada registrada');

        INSERT INTO historico_etapas (ordem_servico_id, etapa_anterior, etapa_nova, usuario_id, valor_orcamento_momento, observacao)
        VALUES (v_os_id, 'AGUARDANDO_ORCAMENTO', 'ORCAMENTO', v_user_id, 1450.00, 'Orçamento inicial elaborado e enviado para aprovação');
    END IF;

    -- 3. Aprovado (Compass - Unidas)
    IF NOT EXISTS (SELECT 1 FROM ordens_servico WHERE veiculo_id = v_compass_id) THEN
        INSERT INTO ordens_servico (veiculo_id, tipo_servico_id, etapa, valor_orcamento, faturado, data_entrada, observacoes)
        VALUES (v_compass_id, 2, 'APROVADO', 3200.00, false, CURRENT_DATE - INTERVAL '3 days', 'Pintura do parachoque dianteiro e polimento técnico.')
        RETURNING id INTO v_os_id;

        INSERT INTO historico_etapas (ordem_servico_id, etapa_anterior, etapa_nova, usuario_id, valor_orcamento_momento, observacao)
        VALUES (v_os_id, 'ORCAMENTO', 'APROVADO', v_user_id, 3200.00, 'Orçamento aprovado pela locadora Unidas');
    END IF;

    -- 4. Em Serviço (T-Cross - Seguradora)
    IF NOT EXISTS (SELECT 1 FROM ordens_servico WHERE veiculo_id = v_tcross_id) THEN
        INSERT INTO ordens_servico (veiculo_id, tipo_servico_id, etapa, valor_orcamento, faturado, data_entrada, observacoes)
        VALUES (v_tcross_id, 2, 'EM_SERVICO', 5800.00, false, CURRENT_DATE - INTERVAL '4 days', 'Recuperação de lateral traseira direita e alinhamento.')
        RETURNING id INTO v_os_id;

        INSERT INTO historico_etapas (ordem_servico_id, etapa_anterior, etapa_nova, usuario_id, valor_orcamento_momento, observacao)
        VALUES (v_os_id, 'APROVADO', 'EM_SERVICO', v_user_id, 5800.00, 'Iniciada funilaria na cabine de pintura');
    END IF;

    -- 5. Em Serviço com Atraso SLA (Creta - Movida: entrada há 8 dias > SLA de 5 dias)
    IF NOT EXISTS (SELECT 1 FROM ordens_servico WHERE veiculo_id = v_creta_id) THEN
        INSERT INTO ordens_servico (veiculo_id, tipo_servico_id, etapa, valor_orcamento, faturado, data_entrada, observacoes)
        VALUES (v_creta_id, 1, 'EM_SERVICO', 4200.00, false, CURRENT_DATE - INTERVAL '8 days', 'Atraso na entrega de peças especiais da suspensão pelo fornecedor.')
        RETURNING id INTO v_os_id;

        INSERT INTO historico_etapas (ordem_servico_id, etapa_anterior, etapa_nova, usuario_id, valor_orcamento_momento, observacao)
        VALUES (v_os_id, 'APROVADO', 'EM_SERVICO', v_user_id, 4200.00, 'Aguardando peças da fábrica; SLA em atenção');
    END IF;

    -- 6. Finalizado (Duster - Concessionária)
    IF NOT EXISTS (SELECT 1 FROM ordens_servico WHERE veiculo_id = v_duster_id) THEN
        INSERT INTO ordens_servico (veiculo_id, tipo_servico_id, etapa, valor_orcamento, faturado, data_entrada, observacoes)
        VALUES (v_duster_id, 1, 'FINALIZADO', 1850.00, false, CURRENT_DATE - INTERVAL '5 days', 'Serviço concluído, veículo passou no controle de qualidade.')
        RETURNING id INTO v_os_id;

        INSERT INTO historico_etapas (ordem_servico_id, etapa_anterior, etapa_nova, usuario_id, valor_orcamento_momento, observacao)
        VALUES (v_os_id, 'EM_SERVICO', 'FINALIZADO', v_user_id, 1850.00, 'Testes de rodagem finalizados com sucesso');
    END IF;

    -- 7. Aguardando Retirada (Strada - Unidas)
    IF NOT EXISTS (SELECT 1 FROM ordens_servico WHERE veiculo_id = v_strada_id) THEN
        INSERT INTO ordens_servico (veiculo_id, tipo_servico_id, etapa, valor_orcamento, faturado, data_entrada, observacoes)
        VALUES (v_strada_id, 1, 'AGUARDANDO_RETIRADA', 2100.00, false, CURRENT_DATE - INTERVAL '6 days', 'Veículo lavado e higienizado, aguardando guincho da locadora.')
        RETURNING id INTO v_os_id;

        INSERT INTO historico_etapas (ordem_servico_id, etapa_anterior, etapa_nova, usuario_id, valor_orcamento_momento, observacao)
        VALUES (v_os_id, 'FINALIZADO', 'AGUARDANDO_RETIRADA', v_user_id, 2100.00, 'Cliente notificado via WhatsApp para retirada');
    END IF;

    -- 8. Entregue e Faturado (Toro - Oficina)
    IF NOT EXISTS (SELECT 1 FROM ordens_servico WHERE veiculo_id = v_toro_id) THEN
        INSERT INTO ordens_servico (veiculo_id, tipo_servico_id, etapa, valor_orcamento, faturado, data_faturamento, numero_nf, data_entrada, data_saida, observacoes)
        VALUES (v_toro_id, 2, 'ENTREGUE', 6500.00, true, CURRENT_DATE, 'NF-2026-0089', CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE - INTERVAL '2 days', 'Serviço completo de pintura e mecânica pesada entregue.')
        RETURNING id INTO v_os_id;

        INSERT INTO historico_etapas (ordem_servico_id, etapa_anterior, etapa_nova, usuario_id, valor_orcamento_momento, observacao)
        VALUES (v_os_id, 'AGUARDANDO_RETIRADA', 'ENTREGUE', v_user_id, 6500.00, 'Veículo entregue e faturado via NF-2026-0089');
    END IF;

    -- 9. Entregue e Faturado (Kicks - Cliente)
    IF NOT EXISTS (SELECT 1 FROM ordens_servico WHERE veiculo_id = v_kicks_id) THEN
        INSERT INTO ordens_servico (veiculo_id, tipo_servico_id, etapa, valor_orcamento, faturado, data_faturamento, numero_nf, data_entrada, data_saida, observacoes)
        VALUES (v_kicks_id, 1, 'ENTREGUE', 3800.00, true, CURRENT_DATE - INTERVAL '5 days', 'NF-2026-0072', CURRENT_DATE - INTERVAL '20 days', CURRENT_DATE - INTERVAL '5 days', 'Troca de amortecedores e geometria completa.')
        RETURNING id INTO v_os_id;

        INSERT INTO historico_etapas (ordem_servico_id, etapa_anterior, etapa_nova, usuario_id, valor_orcamento_momento, observacao)
        VALUES (v_os_id, 'AGUARDANDO_RETIRADA', 'ENTREGUE', v_user_id, 3800.00, 'Veículo entregue ao proprietário');
    END IF;

    -- 10. Aguardando Orçamento (Peugeot 208 - Outro)
    IF NOT EXISTS (SELECT 1 FROM ordens_servico WHERE veiculo_id = v_208_id) THEN
        INSERT INTO ordens_servico (veiculo_id, tipo_servico_id, etapa, valor_orcamento, faturado, data_entrada, observacoes)
        VALUES (v_208_id, 1, 'AGUARDANDO_ORCAMENTO', 0.00, false, CURRENT_DATE, 'Cliente relata falha intermitente na partida elétrica.')
        RETURNING id INTO v_os_id;

        INSERT INTO historico_etapas (ordem_servico_id, etapa_anterior, etapa_nova, usuario_id, valor_orcamento_momento, observacao)
        VALUES (v_os_id, NULL, 'AGUARDANDO_ORCAMENTO', v_user_id, 0.00, 'Entrada registrada');
    END IF;

END $$;
