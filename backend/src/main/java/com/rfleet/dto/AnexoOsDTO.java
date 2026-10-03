package com.rfleet.dto;

import com.rfleet.domain.AnexoOs;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.ZonedDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AnexoOsDTO {

    private Long id;
    private Long ordemServicoId;
    private String nomeArquivo;
    private String tipoConteudo;
    private Long tamanhoBytes;
    private String usuarioNome;
    private ZonedDateTime criadoEm;

    public static AnexoOsDTO fromEntity(AnexoOs a) {
        if (a == null) {
            return null;
        }

        return AnexoOsDTO.builder()
                .id(a.getId())
                .ordemServicoId(a.getOrdemServico() != null ? a.getOrdemServico().getId() : null)
                .nomeArquivo(a.getNomeArquivo())
                .tipoConteudo(a.getTipoConteudo())
                .tamanhoBytes(a.getTamanhoBytes())
                .usuarioNome(a.getUsuario() != null ? a.getUsuario().getNome() : "Sistema")
                .criadoEm(a.getCriadoEm())
                .build();
    }
}
