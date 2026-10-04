package com.rfleet.web;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rfleet.domain.EtapaOrdemServico;
import com.rfleet.domain.OrdemServico;
import com.rfleet.support.GestorDeTeste;
import com.rfleet.dto.ArquivamentoRequest;
import com.rfleet.dto.RegistrarEntradaRequest;
import com.rfleet.repository.OrdemServicoRepository;
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
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class HistoricoControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private GestorDeTeste gestorDeTeste;

    @Autowired
    private OrdemServicoRepository ordemServicoRepository;

    private String tokenJwt;

    @BeforeEach
    void setUp() throws Exception {
        this.tokenJwt = gestorDeTeste.obterToken(mockMvc);
    }

    private Long criarEntregue(String placa, String valor, LocalDate dataSaida) throws Exception {
        RegistrarEntradaRequest request = RegistrarEntradaRequest.builder()
                .placa(placa)
                .modelo("Teste Historico")
                .etapa(EtapaOrdemServico.ENTREGUE)
                .valorOrcamento(new BigDecimal(valor))
                .dataEntrada(LocalDate.of(2019, 12, 1))
                .build();

        MvcResult result = mockMvc.perform(post("/api/ordens-servico")
                        .header("Authorization", "Bearer " + tokenJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();

        Long id = objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asLong();

        OrdemServico os = ordemServicoRepository.findById(id).orElseThrow();
        os.setDataSaida(dataSaida);
        ordemServicoRepository.saveAndFlush(os);
        return id;
    }

    private JsonNode buscarMeses() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/historico/meses")
                        .header("Authorization", "Bearer " + tokenJwt))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private JsonNode encontrarMes(JsonNode meses, int ano, int mes) {
        for (JsonNode item : meses) {
            if (item.get("ano").asInt() == ano && item.get("mes").asInt() == mes) {
                return item;
            }
        }
        return null;
    }

    @Test
    @DisplayName("Deve resumir os entregues por mês de saída, do mais recente ao mais antigo")
    void deveResumirEntreguesPorMes() throws Exception {
        criarEntregue("HSM1A01", "1000.00", LocalDate.of(2020, 1, 10));
        criarEntregue("HSM1A02", "500.00", LocalDate.of(2020, 1, 25));
        criarEntregue("HSM1A03", "300.00", LocalDate.of(2020, 2, 3));

        // Reaberta: saída em jan/2020, mas não está mais em ENTREGUE
        Long reaberta = criarEntregue("HSM1A04", "9999.00", LocalDate.of(2020, 1, 12));
        OrdemServico osReaberta = ordemServicoRepository.findById(reaberta).orElseThrow();
        osReaberta.setEtapa(EtapaOrdemServico.EM_SERVICO);
        ordemServicoRepository.saveAndFlush(osReaberta);

        // Arquivada: não entra no histórico
        Long arquivada = criarEntregue("HSM1A05", "7777.00", LocalDate.of(2020, 1, 15));
        mockMvc.perform(patch("/api/ordens-servico/" + arquivada + "/arquivamento")
                        .header("Authorization", "Bearer " + tokenJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ArquivamentoRequest(true, "Teste"))))
                .andExpect(status().isOk());

        JsonNode meses = buscarMeses();

        JsonNode janeiro = encontrarMes(meses, 2020, 1);
        JsonNode fevereiro = encontrarMes(meses, 2020, 2);

        assertThat(janeiro).isNotNull();
        assertThat(janeiro.get("quantidade").asLong()).isEqualTo(2);
        assertThat(janeiro.get("valorTotal").decimalValue()).isEqualByComparingTo("1500.00");

        assertThat(fevereiro).isNotNull();
        assertThat(fevereiro.get("quantidade").asLong()).isEqualTo(1);
        assertThat(fevereiro.get("valorTotal").decimalValue()).isEqualByComparingTo("300.00");

        // Ordem decrescente em toda a lista
        for (int i = 1; i < meses.size(); i++) {
            int anterior = meses.get(i - 1).get("ano").asInt() * 12 + meses.get(i - 1).get("mes").asInt();
            int atual = meses.get(i).get("ano").asInt() * 12 + meses.get(i).get("mes").asInt();
            assertThat(anterior).isGreaterThan(atual);
        }
    }

    @Test
    @DisplayName("Deve exigir autenticação para consultar o histórico")
    void deveExigirAutenticacao() throws Exception {
        mockMvc.perform(get("/api/historico/meses"))
                .andExpect(status().isUnauthorized());
    }
}
