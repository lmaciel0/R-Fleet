package com.rfleet.dto;

import com.rfleet.domain.Origem;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrigemDTO {

    private Long id;
    private String nome;
    private Boolean ativo;

    public static OrigemDTO fromEntity(Origem origem) {
        if (origem == null) {
            return null;
        }
        return OrigemDTO.builder()
                .id(origem.getId())
                .nome(origem.getNome())
                .ativo(origem.getAtivo())
                .build();
    }
}
