package com.rfleet.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Bytes dos anexos na tabela anexos_conteudo (bytea), fora da entidade AnexoOs:
 * listar anexos nunca carrega os arquivos. A exclusão vem em cascata da tabela anexos_os.
 */
@Repository
public class AnexoConteudoRepository {

    private final JdbcTemplate jdbcTemplate;

    public AnexoConteudoRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public void salvar(Long anexoId, byte[] dados) {
        jdbcTemplate.update("INSERT INTO anexos_conteudo (anexo_id, dados) VALUES (?, ?)", anexoId, dados);
    }

    public Optional<byte[]> buscar(Long anexoId) {
        return jdbcTemplate.query("SELECT dados FROM anexos_conteudo WHERE anexo_id = ?",
                        (rs, linha) -> rs.getBytes("dados"), anexoId)
                .stream()
                .findFirst();
    }
}
