package com.rfleet.dto;

import java.math.BigDecimal;

/**
 * Soma e contagem de OS faturadas, como vem da consulta agregada (a soma é nula quando não há linhas).
 */
public record FaturamentoAgregado(BigDecimal total, long quantidade) {

    public FaturamentoAgregado {
        total = total != null ? total : BigDecimal.ZERO;
    }
}
