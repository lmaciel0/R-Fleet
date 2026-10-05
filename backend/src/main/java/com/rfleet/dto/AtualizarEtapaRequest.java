package com.rfleet.dto;

import com.rfleet.domain.EtapaOrdemServico;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AtualizarEtapaRequest {

    @NotNull(message = "A nova etapa é obrigatória")
    private EtapaOrdemServico novaEtapa;

    private String observacao;

    /** Data da entrega ao cliente; só vale para a etapa ENTREGUE (vazia = hoje). */
    private LocalDate dataSaida;
}
