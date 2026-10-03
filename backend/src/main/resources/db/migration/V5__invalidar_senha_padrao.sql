-- =========================================================================
-- V5: Revoga a senha do gestor semeado pela V2 (hash público no repositório).
-- O registro é mantido (histórico e anexos apontam para ele); a nova senha é
-- definida pelas variáveis RFLEET_GESTOR_* na inicialização (GestorInicial).
-- =========================================================================

UPDATE usuarios
   SET senha_hash = '!SENHA-INVALIDADA',
       atualizado_em = CURRENT_TIMESTAMP
 WHERE id = 'a0000000-0000-0000-0000-000000000001';
