package com.rfleet.dto;

import java.math.BigDecimal;

/**
 * Soma de mão de obra e de peças e contagem de OS faturadas, como vem da consulta agregada
 * (as somas são nulas quando não há linhas).
 */
public record FaturamentoAgregado(BigDecimal maoDeObra, BigDecimal pecas, long quantidade) {

    public FaturamentoAgregado {
        maoDeObra = maoDeObra != null ? maoDeObra : BigDecimal.ZERO;
        pecas = pecas != null ? pecas : BigDecimal.ZERO;
    }

    public BigDecimal total() {
        return maoDeObra.add(pecas);
    }
}
