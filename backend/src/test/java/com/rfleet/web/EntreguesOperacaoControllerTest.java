package com.rfleet.web;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rfleet.domain.EtapaOrdemServico;
import com.rfleet.domain.OrdemServico;
import com.rfleet.dto.AtualizarEtapaRequest;
import com.rfleet.dto.LoginRequest;
import com.rfleet.dto.LoginResponse;
import com.rfleet.dto.RegistrarEntradaRequest;
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
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class EntreguesOperacaoControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private OrdemServicoRepository ordemServicoRepository;

    private String tokenJwt;

    @BeforeEach
    void setUp() throws Exception {
        LoginRequest loginRequest = LoginRequest.builder()
                .email("gestor@exemplo.com")
                .senha("senha-de-teste")
                .build();

        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andReturn();

        LoginResponse loginResponse = objectMapper.readValue(
                result.getResponse().getContentAsString(),
                LoginResponse.class
        );
        this.tokenJwt = loginResponse.getToken();
    }

    private Long criarOs(String placa, EtapaOrdemServico etapa) throws Exception {
        RegistrarEntradaRequest request = RegistrarEntradaRequest.builder()
                .placa(placa)
                .modelo("Teste Historico")
                .etapa(etapa)
                .valorOrcamento(new BigDecimal("1000.00"))
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

    private void definirDataSaida(Long id, LocalDate dataSaida) {
        OrdemServico os = ordemServicoRepository.findById(id).orElseThrow();
        os.setDataSaida(dataSaida);
        ordemServicoRepository.saveAndFlush(os);
    }

    private List<String> placasListadas(MockHttpServletRequestBuilder requisicao) throws Exception {
        MvcResult result = mockMvc.perform(requisicao.header("Authorization", "Bearer " + tokenJwt))
                .andExpect(status().isOk())
                .andReturn();

        List<String> placas = new ArrayList<>();
        for (JsonNode os : objectMapper.readTree(result.getResponse().getContentAsString())) {
            placas.add(os.get("placa").asText());
        }
        return placas;
    }

    @Test
    @DisplayName("Deve ocultar da operação os entregues de meses anteriores, respeitando o limite do mês")
    void deveOcultarEntreguesDeMesesAnteriores() throws Exception {
        LocalDate inicioMes = DataOficina.inicioDoMesCorrente();

        Long ultimoDiaMesAnterior = criarOs("HST1A01", EtapaOrdemServico.ENTREGUE);
        definirDataSaida(ultimoDiaMesAnterior, inicioMes.minusDays(1));

        Long primeiroDiaMesAtual = criarOs("HST1A02", EtapaOrdemServico.ENTREGUE);
        definirDataSaida(primeiroDiaMesAtual, inicioMes);

        criarOs("HST1A03", EtapaOrdemServico.EM_SERVICO);

        // Entregue sem data de saída (dado legado): não pode sumir da operação
        criarOs("HST1A04", EtapaOrdemServico.ENTREGUE);

        List<String> operacao = placasListadas(get("/api/ordens-servico")
                .param("termo", "HST1A")
                .param("ocultarEntreguesAnteriores", "true"));

        assertThat(operacao).containsExactlyInAnyOrder("HST1A02", "HST1A03", "HST1A04");

        List<String> semFiltro = placasListadas(get("/api/ordens-servico")
                .param("termo", "HST1A"));

        assertThat(semFiltro).containsExactlyInAnyOrder("HST1A01", "HST1A02", "HST1A03", "HST1A04");
    }

    @Test
    @DisplayName("OS reaberta volta para a operação e sai do histórico do mês da saída antiga")
    void deveManterOsReabertaNaOperacao() throws Exception {
        LocalDate saidaAntiga = DataOficina.inicioDoMesCorrente().minusMonths(2);

        Long id = criarOs("HST1A05", EtapaOrdemServico.ENTREGUE);
        definirDataSaida(id, saidaAntiga);

        AtualizarEtapaRequest reabrir = AtualizarEtapaRequest.builder()
                .novaEtapa(EtapaOrdemServico.EM_SERVICO)
                .observacao("Retorno em garantia")
                .build();

        mockMvc.perform(patch("/api/ordens-servico/" + id + "/etapa")
                        .header("Authorization", "Bearer " + tokenJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(reabrir)))
                .andExpect(status().isOk());

        List<String> operacao = placasListadas(get("/api/ordens-servico")
                .param("termo", "HST1A05")
                .param("ocultarEntreguesAnteriores", "true"));

        assertThat(operacao).containsExactly("HST1A05");

        List<String> historicoDoMes = placasListadas(get("/api/ordens-servico")
                .param("termo", "HST1A05")
                .param("etapas", "ENTREGUE")
                .param("dataSaidaInicio", saidaAntiga.withDayOfMonth(1).toString())
                .param("dataSaidaFim", saidaAntiga.withDayOfMonth(saidaAntiga.lengthOfMonth()).toString()));

        assertThat(historicoDoMes).isEmpty();
    }

    @Test
    @DisplayName("OS reaberta e entregue de novo recebe a data de saída de hoje e continua na operação")
    void deveRedefinirDataSaidaAoEntregarNovamente() throws Exception {
        Long id = criarOs("HST1A10", EtapaOrdemServico.ENTREGUE);
        definirDataSaida(id, DataOficina.inicioDoMesCorrente().minusMonths(2));

        for (EtapaOrdemServico etapa : List.of(EtapaOrdemServico.EM_SERVICO, EtapaOrdemServico.ENTREGUE)) {
            AtualizarEtapaRequest request = AtualizarEtapaRequest.builder().novaEtapa(etapa).build();
            mockMvc.perform(patch("/api/ordens-servico/" + id + "/etapa")
                            .header("Authorization", "Bearer " + tokenJwt)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk());
        }

        assertThat(ordemServicoRepository.findById(id).orElseThrow().getDataSaida())
                .isEqualTo(DataOficina.hoje());

        List<String> operacao = placasListadas(get("/api/ordens-servico")
                .param("termo", "HST1A10")
                .param("ocultarEntreguesAnteriores", "true"));

        assertThat(operacao).containsExactly("HST1A10");
    }

    @Test
    @DisplayName("Deve filtrar entregues pelo período de saída")
    void deveFiltrarPorPeriodoDeSaida() throws Exception {
        Long janeiro = criarOs("HST1A06", EtapaOrdemServico.ENTREGUE);
        definirDataSaida(janeiro, LocalDate.of(2020, 1, 15));

        Long fevereiro = criarOs("HST1A07", EtapaOrdemServico.ENTREGUE);
        definirDataSaida(fevereiro, LocalDate.of(2020, 2, 10));

        List<String> placas = placasListadas(get("/api/ordens-servico")
                .param("termo", "HST1A0")
                .param("etapas", "ENTREGUE")
                .param("dataSaidaInicio", "2020-01-01")
                .param("dataSaidaFim", "2020-01-31"));

        assertThat(placas).containsExactly("HST1A06");
    }

    @Test
    @DisplayName("Deve exportar CSV filtrado pelo período de saída")
    void deveExportarCsvFiltradoPorSaida() throws Exception {
        Long janeiro = criarOs("HST1A08", EtapaOrdemServico.ENTREGUE);
        definirDataSaida(janeiro, LocalDate.of(2020, 1, 20));

        Long fevereiro = criarOs("HST1A09", EtapaOrdemServico.ENTREGUE);
        definirDataSaida(fevereiro, LocalDate.of(2020, 2, 5));

        MvcResult result = mockMvc.perform(get("/api/exportacao/ordens-servico")
                        .header("Authorization", "Bearer " + tokenJwt)
                        .param("formato", "csv")
                        .param("etapas", "ENTREGUE")
                        .param("dataSaidaInicio", "2020-01-01")
                        .param("dataSaidaFim", "2020-01-31"))
                .andExpect(status().isOk())
                .andReturn();

        String csv = result.getResponse().getContentAsString(StandardCharsets.UTF_8);
        assertThat(csv).contains("HST1A08");
        assertThat(csv).doesNotContain("HST1A09");
    }
}
