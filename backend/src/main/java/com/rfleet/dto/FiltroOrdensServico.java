package com.rfleet.dto;

import com.rfleet.domain.EtapaOrdemServico;

import java.time.LocalDate;
import java.util.List;

/**
 * Filtros da listagem e da exportação de ordens de serviço.
 */
public record FiltroOrdensServico(
        String termo,
        List<EtapaOrdemServico> etapas,
        Long origemId,
        Long tipoServicoId,
        Boolean faturado,
        Boolean concluido,
        LocalDate dataEntradaInicio,
        LocalDate dataEntradaFim,
        Boolean emAtraso,
        Boolean ativo
) {
}
