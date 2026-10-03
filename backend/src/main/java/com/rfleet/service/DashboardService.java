package com.rfleet.service;

import com.rfleet.domain.EtapaOrdemServico;
import com.rfleet.domain.OrdemServico;
import com.rfleet.dto.DashboardMetricasDTO;
import com.rfleet.repository.OrdemServicoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class DashboardService {

    private final OrdemServicoRepository ordemServicoRepository;
    private final OrdemServicoService ordemServicoService;

    public DashboardService(
            OrdemServicoRepository ordemServicoRepository,
            OrdemServicoService ordemServicoService
    ) {
        this.ordemServicoRepository = ordemServicoRepository;
        this.ordemServicoService = ordemServicoService;
    }

    @Transactional(readOnly = true)
    public DashboardMetricasDTO obterMetricas(LocalDate dataReferencia) {
        LocalDate hoje = dataReferencia != null ? dataReferencia : LocalDate.now();

        long limiteSla = ordemServicoService.obterLimiteDiasSla();

        List<OrdemServico> todasAtivas = ordemServicoRepository.findByAtivoTrue();

        // Veículos atualmente no pátio (etapa != ENTREGUE)
        List<OrdemServico> patio = todasAtivas.stream()
                .filter(os -> os.getEtapa() != EtapaOrdemServico.ENTREGUE)
                .toList();

        long totalPatio = patio.size();

        long emAtraso = patio.stream()
                .filter(os -> "VERMELHO".equals(os.calcularStatusSla(limiteSla, hoje)))
                .count();

        double tempoMedioPatio = patio.isEmpty() ? 0.0 :
                patio.stream()
                        .mapToLong(os -> os.calcularDiasNoPatio(hoje))
                        .average()
                        .orElse(0.0);

        // Arredondar para 1 casa decimal
        tempoMedioPatio = BigDecimal.valueOf(tempoMedioPatio)
                .setScale(1, RoundingMode.HALF_UP)
                .doubleValue();

        BigDecimal totalOrcadoPatio = patio.stream()
                .map(os -> os.getValorOrcamento() != null ? os.getValorOrcamento() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Faturamento no mês atual
        int mesAtual = hoje.getMonthValue();
        int anoAtual = hoje.getYear();

        BigDecimal faturamentoMesAtual = todasAtivas.stream()
                .filter(os -> Boolean.TRUE.equals(os.getFaturado()))
                .filter(os -> os.getDataFaturamento() != null
                        && os.getDataFaturamento().getMonthValue() == mesAtual
                        && os.getDataFaturamento().getYear() == anoAtual)
                .map(os -> os.getValorOrcamento() != null ? os.getValorOrcamento() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalFaturadoGeral = todasAtivas.stream()
                .filter(os -> Boolean.TRUE.equals(os.getFaturado()))
                .map(os -> os.getValorOrcamento() != null ? os.getValorOrcamento() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long totalFaturadas = todasAtivas.stream()
                .filter(os -> Boolean.TRUE.equals(os.getFaturado()))
                .count();

        long totalNaoFaturadas = todasAtivas.size() - totalFaturadas;

        // Distribuição por Etapa (garantindo todas as 7 etapas inicializadas)
        Map<EtapaOrdemServico, Long> distribuicaoEtapas = new EnumMap<>(EtapaOrdemServico.class);
        for (EtapaOrdemServico etapa : EtapaOrdemServico.values()) {
            distribuicaoEtapas.put(etapa, 0L);
        }
        for (OrdemServico os : todasAtivas) {
            if (os.getEtapa() != null) {
                distribuicaoEtapas.put(os.getEtapa(), distribuicaoEtapas.get(os.getEtapa()) + 1L);
            }
        }

        // Distribuição por Origem no Pátio
        Map<String, Long> distribuicaoOrigem = patio.stream()
                .collect(Collectors.groupingBy(
                        os -> (os.getVeiculo() != null && os.getVeiculo().getOrigemPadrao() != null)
                                ? os.getVeiculo().getOrigemPadrao().getNome()
                                : "Não Informada",
                        Collectors.counting()
                ));

        return DashboardMetricasDTO.builder()
                .totalVeiculosPatio(totalPatio)
                .veiculosEmAtraso(emAtraso)
                .tempoMedioPatioDias(tempoMedioPatio)
                .faturamentoMesAtual(faturamentoMesAtual)
                .totalOrcadoPatio(totalOrcadoPatio)
                .totalFaturadoGeral(totalFaturadoGeral)
                .totalFaturadas(totalFaturadas)
                .totalNaoFaturadas(totalNaoFaturadas)
                .limiteSlaDias(limiteSla)
                .distribuicaoPorEtapa(distribuicaoEtapas)
                .distribuicaoPorOrigem(distribuicaoOrigem)
                .build();
    }
}
