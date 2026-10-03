package com.rfleet.dto;

import com.rfleet.domain.TipoServico;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TipoServicoDTO {

    private Long id;
    private String nome;
    private Boolean ativo;

    public static TipoServicoDTO fromEntity(TipoServico tipoServico) {
        if (tipoServico == null) {
            return null;
        }
        return TipoServicoDTO.builder()
                .id(tipoServico.getId())
                .nome(tipoServico.getNome())
                .ativo(tipoServico.getAtivo())
                .build();
    }
}
