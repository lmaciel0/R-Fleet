package com.rfleet.dto;

import java.math.BigDecimal;

/**
 * Faturamento de um mês (pela data de faturamento), a comissão sobre ele e o total faturado de todos os meses.
 */
public record FaturamentoMesDTO(
        BigDecimal total,
        long quantidade,
        BigDecimal comissaoPercentual,
        BigDecimal comissao,
        BigDecimal totalGeral
) {
}
