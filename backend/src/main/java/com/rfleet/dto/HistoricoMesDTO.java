package com.rfleet.dto;

import java.math.BigDecimal;

/**
 * Resumo de um mês do histórico: veículos entregues (por data de saída) e valor total.
 */
public record HistoricoMesDTO(
        Integer ano,
        Integer mes,
        Long quantidade,
        BigDecimal valorTotal
) {
}
