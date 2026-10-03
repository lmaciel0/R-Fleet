package com.rfleet.dto;

import com.rfleet.domain.EtapaOrdemServico;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardMetricasDTO {

    private long totalVeiculosPatio;
    private long veiculosEmAtraso;

    private BigDecimal faturamentoMesAtual;
    private BigDecimal comissaoPercentual;
    private BigDecimal comissaoMesAtual;
    private BigDecimal totalOrcadoPatio;
    private BigDecimal totalFaturadoGeral;

    private long totalFaturadas;
    private long totalNaoFaturadas;

    private long limiteSlaDias;

    private Map<EtapaOrdemServico, Long> distribuicaoPorEtapa;
    private Map<String, Long> distribuicaoPorOrigem;
}
