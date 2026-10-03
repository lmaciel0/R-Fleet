package com.rfleet.dto;

import com.rfleet.domain.EtapaOrdemServico;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AtualizarEtapaRequest {

    @NotNull(message = "A nova etapa é obrigatória")
    private EtapaOrdemServico novaEtapa;

    private String observacao;
}
