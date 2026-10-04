package com.rfleet.dto;

import jakarta.validation.constraints.NotNull;

/**
 * Arquiva (arquivada = true, motivo obrigatório) ou restaura (arquivada = false, motivo opcional) uma OS.
 */
public record ArquivamentoRequest(
        @NotNull(message = "Informe se a OS deve ser arquivada ou restaurada")
        Boolean arquivada,
        String motivo
) {
}
