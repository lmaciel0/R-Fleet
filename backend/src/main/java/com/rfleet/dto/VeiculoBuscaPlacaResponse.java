package com.rfleet.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VeiculoBuscaPlacaResponse {

    private boolean encontrado;
    private Long veiculoId;
    private String placa;
    private String placaFormatada;
    private String modelo;
    private Long origemId;
    private String origemNome;
    private boolean mercosul;

    // Indicadores de conflito de OS ativa
    private boolean possuiOsAtiva;
    private Long osAtivaId;
    private String osAtivaEtapa;
    private String mensagemAlerta;
}
