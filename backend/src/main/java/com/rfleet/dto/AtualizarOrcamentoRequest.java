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

    @NotNull(message = "O valor da mão de obra é obrigatório")
    @PositiveOrZero(message = "O valor da mão de obra deve ser positivo ou zero")
    private BigDecimal valorMaoDeObra;

    @NotNull(message = "O valor das peças é obrigatório (use 0,00 quando não houver)")
    @PositiveOrZero(message = "O valor das peças deve ser positivo ou zero")
    private BigDecimal valorPecas;

    private String justificativa;
}
