package com.rfleet.service;

import com.rfleet.domain.EtapaOrdemServico;
import com.rfleet.domain.OrdemServico;
import com.rfleet.dto.DashboardMetricasDTO;
import com.rfleet.dto.FaturamentoAgregado;
import com.rfleet.dto.FaturamentoMesDTO;
import com.rfleet.repository.ConfiguracaoRepository;
import com.rfleet.repository.OrdemServicoRepository;
import com.rfleet.util.DataOficina;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class DashboardService {

    private static final String CHAVE_COMISSAO_MAO_DE_OBRA = "COMISSAO_PERCENTUAL_MAO_DE_OBRA";
    private static final String CHAVE_COMISSAO_PECAS = "COMISSAO_PERCENTUAL_PECAS";
    private static final BigDecimal PERCENTUAL_COMISSAO_PADRAO = BigDecimal.ONE;
    private static final BigDecimal CEM = new BigDecimal("100");

    private final OrdemServicoRepository ordemServicoRepository;
    private final OrdemServicoService ordemServicoService;
    private final ConfiguracaoRepository configuracaoRepository;

    public DashboardService(
            OrdemServicoRepository ordemServicoRepository,
            OrdemServicoService ordemServicoService,
            ConfiguracaoRepository configuracaoRepository
    ) {
        this.ordemServicoRepository = ordemServicoRepository;
        this.ordemServicoService = ordemServicoService;
        this.configuracaoRepository = configuracaoRepository;
    }

    @Transactional(readOnly = true)
    public DashboardMetricasDTO obterMetricas(LocalDate dataReferencia) {
        LocalDate hoje = dataReferencia != null ? dataReferencia : DataOficina.hoje();
        LocalDate inicioMes = hoje.withDayOfMonth(1);

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

        BigDecimal totalOrcadoPatio = patio.stream()
                .map(os -> os.getValorOrcamento() != null ? os.getValorOrcamento() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Faturamento no mês atual, dividido em mão de obra e peças, e a comissão de cada parte
        FaturamentoAgregado doMes = ordemServicoRepository.somarFaturadoEntre(inicioMes, YearMonth.from(hoje).atEndOfMonth());
        Comissao comissao = calcularComissao(doMes);

        BigDecimal totalFaturadoGeral = todasAtivas.stream()
                .filter(os -> Boolean.TRUE.equals(os.getFaturado()))
                .map(os -> os.getValorOrcamento() != null ? os.getValorOrcamento() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long totalFaturadas = todasAtivas.stream()
                .filter(os -> Boolean.TRUE.equals(os.getFaturado()))
                .count();

        long totalNaoFaturadas = todasAtivas.size() - totalFaturadas;

        // Distribuição por Etapa (todas as 7 etapas inicializadas; Entregue só do mês corrente, como no Kanban)
        Map<EtapaOrdemServico, Long> distribuicaoEtapas = new EnumMap<>(EtapaOrdemServico.class);
        for (EtapaOrdemServico etapa : EtapaOrdemServico.values()) {
            distribuicaoEtapas.put(etapa, 0L);
        }
        for (OrdemServico os : todasAtivas) {
            if (os.getEtapa() != null && !entregueEmMesAnterior(os, inicioMes)) {
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
                .faturamentoMesAtual(doMes.total())
                .faturamentoMaoDeObraMesAtual(doMes.maoDeObra())
                .faturamentoPecasMesAtual(doMes.pecas())
                .comissaoPercentualMaoDeObra(comissao.percentualMaoDeObra())
                .comissaoPercentualPecas(comissao.percentualPecas())
                .comissaoMaoDeObraMesAtual(comissao.maoDeObra())
                .comissaoPecasMesAtual(comissao.pecas())
                .comissaoMesAtual(comissao.total())
                .totalOrcadoPatio(totalOrcadoPatio)
                .totalFaturadoGeral(totalFaturadoGeral)
                .totalFaturadas(totalFaturadas)
                .totalNaoFaturadas(totalNaoFaturadas)
                .limiteSlaDias(limiteSla)
                .distribuicaoPorEtapa(distribuicaoEtapas)
                .distribuicaoPorOrigem(distribuicaoOrigem)
                .build();
    }

    /**
     * Faturado no mês escolhido (OS ativas com faturado = true e data de faturamento dentro do mês),
     * mais a comissão sobre ele e o total faturado de todos os meses.
     */
    @Transactional(readOnly = true)
    public FaturamentoMesDTO obterFaturamentoDoMes(int ano, int mes) {
        if (mes < 1 || mes > 12 || ano < 1900 || ano > 9999) {
            throw new IllegalArgumentException("Mês inválido.");
        }
        YearMonth anoMes = YearMonth.of(ano, mes);
        FaturamentoAgregado doMes = ordemServicoRepository.somarFaturadoEntre(anoMes.atDay(1), anoMes.atEndOfMonth());
        FaturamentoAgregado geral = ordemServicoRepository.somarFaturadoGeral();
        Comissao comissao = calcularComissao(doMes);

        return new FaturamentoMesDTO(
                doMes.total(),
                doMes.quantidade(),
                doMes.maoDeObra(),
                doMes.pecas(),
                comissao.percentualMaoDeObra(),
                comissao.percentualPecas(),
                comissao.maoDeObra(),
                comissao.pecas(),
                comissao.total(),
                geral.total()
        );
    }

    /**
     * Comissão do mês: um percentual sobre a mão de obra e outro sobre as peças, cada parte arredondada
     * em 2 casas (HALF_UP). O total é a soma das duas partes já arredondadas.
     */
    private Comissao calcularComissao(FaturamentoAgregado faturado) {
        BigDecimal percentualMaoDeObra = obterPercentual(CHAVE_COMISSAO_MAO_DE_OBRA);
        BigDecimal percentualPecas = obterPercentual(CHAVE_COMISSAO_PECAS);
        return new Comissao(
                percentualMaoDeObra,
                percentualPecas,
                aplicarPercentual(faturado.maoDeObra(), percentualMaoDeObra),
                aplicarPercentual(faturado.pecas(), percentualPecas)
        );
    }

    private static BigDecimal aplicarPercentual(BigDecimal valor, BigDecimal percentual) {
        return valor.multiply(percentual).divide(CEM, 2, RoundingMode.HALF_UP);
    }

    private record Comissao(BigDecimal percentualMaoDeObra, BigDecimal percentualPecas,
                            BigDecimal maoDeObra, BigDecimal pecas) {
        BigDecimal total() {
            return maoDeObra.add(pecas);
        }
    }

    /**
     * Mesmo critério do filtro ocultarEntreguesAnteriores: entregue com saída antes do mês corrente.
     */
    private static boolean entregueEmMesAnterior(OrdemServico os, LocalDate inicioMes) {
        return os.getEtapa() == EtapaOrdemServico.ENTREGUE
                && os.getDataSaida() != null
                && os.getDataSaida().isBefore(inicioMes);
    }

    private BigDecimal obterPercentual(String chave) {
        return configuracaoRepository.findById(chave)
                .map(c -> {
                    try {
                        return new BigDecimal(c.getValor().trim());
                    } catch (RuntimeException e) {
                        return null;
                    }
                })
                .filter(p -> p.signum() >= 0)
                .orElse(PERCENTUAL_COMISSAO_PADRAO);
    }
}
