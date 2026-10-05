package com.rfleet.web;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rfleet.domain.Configuracao;
import com.rfleet.domain.EtapaOrdemServico;
import com.rfleet.domain.OrdemServico;
import com.rfleet.dto.AtualizarFaturamentoRequest;
import com.rfleet.support.GestorDeTeste;
import com.rfleet.dto.RegistrarEntradaRequest;
import com.rfleet.repository.ConfiguracaoRepository;
import com.rfleet.repository.OrdemServicoRepository;
import com.rfleet.util.DataOficina;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class DashboardControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private GestorDeTeste gestorDeTeste;

    @Autowired
    private ConfiguracaoRepository configuracaoRepository;

    @Autowired
    private OrdemServicoRepository ordemServicoRepository;

    private String tokenJwt;

    private JsonNode buscarMetricas() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/dashboard/metricas")
                        .header("Authorization", "Bearer " + tokenJwt))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private Long criarOs(String placa, EtapaOrdemServico etapa, String valor) throws Exception {
        RegistrarEntradaRequest request = RegistrarEntradaRequest.builder()
                .placa(placa)
                .modelo("Teste Comissao")
                .etapa(etapa)
                .valorOrcamento(new BigDecimal(valor))
                .dataEntrada(LocalDate.of(2019, 12, 1))
                .build();

        MvcResult result = mockMvc.perform(post("/api/ordens-servico")
                        .header("Authorization", "Bearer " + tokenJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();

        return objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asLong();
    }

    private void faturar(Long id, LocalDate dataFaturamento) throws Exception {
        AtualizarFaturamentoRequest request = AtualizarFaturamentoRequest.builder()
                .faturado(true)
                .dataFaturamento(dataFaturamento)
                .build();

        mockMvc.perform(patch("/api/ordens-servico/" + id + "/faturamento")
                        .header("Authorization", "Bearer " + tokenJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }

    private static BigDecimal comissaoEsperada(BigDecimal faturamento, String percentual) {
        return faturamento.multiply(new BigDecimal(percentual))
                .divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
    }

    @BeforeEach
    void setUp() throws Exception {
        this.tokenJwt = gestorDeTeste.obterToken(mockMvc);

        // Cadastrar uma OS no pátio com entrada há 10 dias para testar atraso
        RegistrarEntradaRequest osAtrasada = RegistrarEntradaRequest.builder()
                .placa("DSH1A01")
                .modelo("Chevrolet Onix Plus")
                .valorOrcamento(new BigDecimal("3500.00"))
                .dataEntrada(LocalDate.now().minusDays(10))
                .build();

        mockMvc.perform(post("/api/ordens-servico")
                        .header("Authorization", "Bearer " + tokenJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(osAtrasada)))
                .andExpect(status().isCreated());

        // OS já finalizada há 30 dias: semáforo verde, não deve contar como atraso
        RegistrarEntradaRequest osFinalizada = RegistrarEntradaRequest.builder()
                .placa("DSH1A02")
                .modelo("Fiat Argo")
                .etapa(EtapaOrdemServico.FINALIZADO)
                .valorOrcamento(new BigDecimal("1200.00"))
                .dataEntrada(LocalDate.now().minusDays(30))
                .build();

        mockMvc.perform(post("/api/ordens-servico")
                        .header("Authorization", "Bearer " + tokenJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(osFinalizada)))
                .andExpect(status().isCreated());
    }

    @Test
    @DisplayName("Deve calcular e retornar métricas operacionais e financeiras do dashboard")
    void deveRetornarMetricasDashboard() throws Exception {
        mockMvc.perform(get("/api/dashboard/metricas")
                        .header("Authorization", "Bearer " + tokenJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalVeiculosPatio").isNumber())
                .andExpect(jsonPath("$.veiculosEmAtraso").isNumber())
                .andExpect(jsonPath("$.tempoMedioPatioDias").doesNotExist())
                .andExpect(jsonPath("$.comissaoMesAtual").isNumber())
                .andExpect(jsonPath("$.comissaoPercentual").value(2))
                .andExpect(jsonPath("$.totalOrcadoPatio").isNumber())
                .andExpect(jsonPath("$.distribuicaoPorEtapa").isMap())
                .andExpect(jsonPath("$.distribuicaoPorEtapa.AGUARDANDO_ORCAMENTO").isNumber())
                .andExpect(jsonPath("$.distribuicaoPorEtapa.EM_SERVICO").isNumber())
                .andExpect(jsonPath("$.distribuicaoPorEtapa.ENTREGUE").isNumber())
                .andExpect(jsonPath("$.limiteSlaDias").value(15));
    }

    @Test
    @DisplayName("Deve contar em atraso exatamente as OS que a listagem filtra como atrasadas")
    void deveContarAtrasoComMesmoCriterioDaListagem() throws Exception {
        MvcResult listagem = mockMvc.perform(get("/api/ordens-servico")
                        .param("emAtraso", "true")
                        .header("Authorization", "Bearer " + tokenJwt))
                .andExpect(status().isOk())
                .andReturn();

        int atrasadasNaListagem = objectMapper.readTree(listagem.getResponse().getContentAsString()).size();

        mockMvc.perform(get("/api/dashboard/metricas")
                        .header("Authorization", "Bearer " + tokenJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.veiculosEmAtraso").value(atrasadasNaListagem));
    }

    @Test
    @DisplayName("Comissão mensal é o percentual configurado sobre o faturado no mês, com 2 casas HALF_UP")
    void deveCalcularComissaoSobreFaturadoDoMes() throws Exception {
        Long id = criarOs("DSH1A03", EtapaOrdemServico.FINALIZADO, "10000.00");
        faturar(id, DataOficina.hoje());

        // Valor quebrado para exercitar o arredondamento
        Long quebrado = criarOs("DSH1A04", EtapaOrdemServico.FINALIZADO, "333.33");
        faturar(quebrado, DataOficina.hoje());

        JsonNode metricas = buscarMetricas();
        BigDecimal faturamento = metricas.get("faturamentoMesAtual").decimalValue();
        BigDecimal comissao = metricas.get("comissaoMesAtual").decimalValue();

        assertThat(faturamento).isGreaterThanOrEqualTo(new BigDecimal("10333.33"));
        assertThat(metricas.get("comissaoPercentual").decimalValue()).isEqualByComparingTo("2");
        assertThat(comissao).isEqualByComparingTo(comissaoEsperada(faturamento, "2"));
        assertThat(comissao.scale()).isLessThanOrEqualTo(2);

        configuracaoRepository.saveAndFlush(Configuracao.builder()
                .chave("COMISSAO_PERCENTUAL")
                .valor("2.5")
                .descricao("teste")
                .build());

        JsonNode depois = buscarMetricas();
        assertThat(depois.get("comissaoPercentual").decimalValue()).isEqualByComparingTo("2.5");
        assertThat(depois.get("comissaoMesAtual").decimalValue())
                .isEqualByComparingTo(comissaoEsperada(faturamento, "2.5"));
    }

    @Test
    @DisplayName("OS faturada no mês passado não entra no faturamento nem na comissão do mês")
    void naoDeveContarFaturadoDoMesPassado() throws Exception {
        BigDecimal antes = buscarMetricas().get("faturamentoMesAtual").decimalValue();

        Long id = criarOs("DSH1A05", EtapaOrdemServico.FINALIZADO, "7000.00");
        faturar(id, DataOficina.hoje().minusMonths(1));

        BigDecimal depois = buscarMetricas().get("faturamentoMesAtual").decimalValue();
        assertThat(depois).isEqualByComparingTo(antes);
    }

    @Test
    @DisplayName("Coluna Entregue do dashboard conta só os entregues do mês corrente")
    void deveContarEntregueSoDoMesCorrente() throws Exception {
        long antes = buscarMetricas().get("distribuicaoPorEtapa").get("ENTREGUE").asLong();

        Long mesPassado = criarOs("DSH1A06", EtapaOrdemServico.ENTREGUE, "100.00");
        OrdemServico antiga = ordemServicoRepository.findById(mesPassado).orElseThrow();
        antiga.setDataSaida(DataOficina.inicioDoMesCorrente().minusDays(1));
        ordemServicoRepository.saveAndFlush(antiga);

        assertThat(buscarMetricas().get("distribuicaoPorEtapa").get("ENTREGUE").asLong()).isEqualTo(antes);

        Long esteMes = criarOs("DSH1A07", EtapaOrdemServico.ENTREGUE, "100.00");
        OrdemServico atual = ordemServicoRepository.findById(esteMes).orElseThrow();
        atual.setDataSaida(DataOficina.hoje());
        ordemServicoRepository.saveAndFlush(atual);

        assertThat(buscarMetricas().get("distribuicaoPorEtapa").get("ENTREGUE").asLong()).isEqualTo(antes + 1);
    }

    private JsonNode buscarFaturamento(int ano, int mes) throws Exception {
        MvcResult result = mockMvc.perform(get("/api/dashboard/faturamento")
                        .param("ano", String.valueOf(ano))
                        .param("mes", String.valueOf(mes))
                        .header("Authorization", "Bearer " + tokenJwt))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    @Test
    @DisplayName("Faturamento de um mês soma só as OS faturadas naquele mês, pela data de faturamento")
    void deveSomarFaturadoDoMesEscolhido() throws Exception {
        faturar(criarOs("DSH1B01", EtapaOrdemServico.ENTREGUE, "1000.00"), LocalDate.of(2020, 3, 5));
        faturar(criarOs("DSH1B02", EtapaOrdemServico.ENTREGUE, "333.33"), LocalDate.of(2020, 3, 31));
        faturar(criarOs("DSH1B03", EtapaOrdemServico.ENTREGUE, "500.00"), LocalDate.of(2020, 4, 1));
        criarOs("DSH1B04", EtapaOrdemServico.ENTREGUE, "200.00"); // não faturada

        JsonNode marco = buscarFaturamento(2020, 3);

        assertThat(marco.get("total").decimalValue()).isEqualByComparingTo("1333.33");
        assertThat(marco.get("quantidade").asLong()).isEqualTo(2);
        assertThat(marco.get("comissaoPercentual").decimalValue()).isEqualByComparingTo("2");
        assertThat(marco.get("comissao").decimalValue()).isEqualByComparingTo("26.67");
        assertThat(marco.get("totalGeral").decimalValue())
                .isEqualByComparingTo(buscarMetricas().get("totalFaturadoGeral").decimalValue())
                .isGreaterThanOrEqualTo(new BigDecimal("1833.33"));

        assertThat(buscarFaturamento(2020, 4).get("total").decimalValue()).isEqualByComparingTo("500.00");
    }

    @Test
    @DisplayName("Carro que entrou num mês e foi faturado no seguinte conta no mês do faturamento")
    void deveContarNoMesDoFaturamentoEnaoNoDaEntrada() throws Exception {
        faturar(criarOs("DSH1B05", EtapaOrdemServico.ENTREGUE, "800.00"), LocalDate.of(2020, 1, 10));

        assertThat(buscarFaturamento(2019, 12).get("quantidade").asLong()).isZero();
        assertThat(buscarFaturamento(2020, 1).get("total").decimalValue()).isEqualByComparingTo("800.00");
    }

    @Test
    @DisplayName("Mês sem faturamento devolve zeros, e OS arquivada não conta")
    void deveDevolverZeroEignorarArquivada() throws Exception {
        JsonNode vazio = buscarFaturamento(2018, 1);
        assertThat(vazio.get("total").decimalValue()).isEqualByComparingTo("0");
        assertThat(vazio.get("quantidade").asLong()).isZero();
        assertThat(vazio.get("comissao").decimalValue()).isEqualByComparingTo("0");

        Long id = criarOs("DSH1B06", EtapaOrdemServico.ENTREGUE, "900.00");
        faturar(id, LocalDate.of(2018, 2, 10));
        OrdemServico os = ordemServicoRepository.findById(id).orElseThrow();
        os.setAtivo(false);
        ordemServicoRepository.saveAndFlush(os);

        assertThat(buscarFaturamento(2018, 2).get("quantidade").asLong()).isZero();
    }

    @Test
    @DisplayName("Comissão do mês usa o percentual configurado")
    void deveUsarPercentualConfiguradoNaComissaoDoMes() throws Exception {
        faturar(criarOs("DSH1B07", EtapaOrdemServico.ENTREGUE, "10000.00"), LocalDate.of(2017, 6, 15));
        configuracaoRepository.saveAndFlush(Configuracao.builder()
                .chave("COMISSAO_PERCENTUAL")
                .valor("2.5")
                .descricao("teste")
                .build());

        JsonNode junho = buscarFaturamento(2017, 6);

        assertThat(junho.get("comissaoPercentual").decimalValue()).isEqualByComparingTo("2.5");
        assertThat(junho.get("comissao").decimalValue()).isEqualByComparingTo("250.00");
    }

    @Test
    @DisplayName("Mês fora de 1 a 12 é rejeitado com 400")
    void deveRejeitarMesInvalido() throws Exception {
        mockMvc.perform(get("/api/dashboard/faturamento")
                        .param("ano", "2026")
                        .param("mes", "13")
                        .header("Authorization", "Bearer " + tokenJwt))
                .andExpect(status().isBadRequest());
    }
}
