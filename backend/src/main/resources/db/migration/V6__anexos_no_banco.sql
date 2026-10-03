-- Os bytes dos anexos passam a ficar no PostgreSQL: o disco do servidor no plano grátis do Render
-- é apagado a cada deploy e a cada vez que o serviço volta de uma pausa.
-- Tabela separada para que listar anexos nunca carregue os arquivos.
CREATE TABLE anexos_conteudo (
    anexo_id BIGINT PRIMARY KEY REFERENCES anexos_os(id) ON DELETE CASCADE,
    dados    BYTEA  NOT NULL
);

-- Anexos gravados em disco antes desta versão ficam sem conteúdo: o download responde 404.
ALTER TABLE anexos_os DROP COLUMN caminho_storage;
