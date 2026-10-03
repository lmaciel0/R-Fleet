package com.rfleet.dto;

import com.rfleet.domain.Veiculo;
import com.rfleet.util.PlacaUtils;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.ZonedDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VeiculoDTO {

    private Long id;
    private String placa;
    private String placaFormatada;
    private String modelo;
    private Long origemId;
    private String origemNome;
    private boolean mercosul;
    private ZonedDateTime criadoEm;

    public static VeiculoDTO fromEntity(Veiculo veiculo) {
        if (veiculo == null) {
            return null;
        }
        return VeiculoDTO.builder()
                .id(veiculo.getId())
                .placa(veiculo.getPlaca())
                .placaFormatada(PlacaUtils.formatar(veiculo.getPlaca()))
                .modelo(veiculo.getModelo())
                .origemId(veiculo.getOrigemPadrao() != null ? veiculo.getOrigemPadrao().getId() : null)
                .origemNome(veiculo.getOrigemPadrao() != null ? veiculo.getOrigemPadrao().getNome() : null)
                .mercosul(PlacaUtils.isMercosul(veiculo.getPlaca()))
                .criadoEm(veiculo.getCriadoEm())
                .build();
    }
}
