package com.rfleet.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AtualizarOrcamentoRequest {

    @NotNull(message = "O valor do orçamento é obrigatório")
    @PositiveOrZero(message = "O valor deve ser positivo ou zero")
    private BigDecimal valor;

    private String justificativa;
}
