package com.rfleet.dto;

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
public class AtualizarFaturamentoRequest {

    @NotNull(message = "O status de faturamento (Sim/Não) é obrigatório")
    private Boolean faturado;

    private LocalDate dataFaturamento;

    private String numeroNf;
}
