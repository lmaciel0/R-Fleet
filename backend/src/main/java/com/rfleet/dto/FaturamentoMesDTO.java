package com.rfleet.dto;

import java.math.BigDecimal;

/**
 * Faturamento de um mês (pela data de faturamento) dividido em mão de obra e peças, a comissão sobre cada parte
 * e o total faturado de todos os meses. Traz também a previsão do mês: OS entregues no mês e ainda não
 * faturadas (quantidade, valor e comissão prevista).
 */
public record FaturamentoMesDTO(
        BigDecimal total,
        long quantidade,
        BigDecimal totalMaoDeObra,
        BigDecimal totalPecas,
        BigDecimal percentualMaoDeObra,
        BigDecimal percentualPecas,
        BigDecimal comissaoMaoDeObra,
        BigDecimal comissaoPecas,
        BigDecimal comissao,
        BigDecimal totalGeral,
        long aFaturarQuantidade,
        BigDecimal aFaturarTotal,
        BigDecimal aFaturarComissao
) {
}
