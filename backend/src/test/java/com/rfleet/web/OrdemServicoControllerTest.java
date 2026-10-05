package com.rfleet.web;

import com.rfleet.support.GestorDeTeste;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rfleet.domain.EtapaOrdemServico;
import com.rfleet.dto.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;

import java.math.BigDecimal;
import java.time.LocalDate;

import org.springframework.transaction.annotation.Transactional;

import com.rfleet.util.DataOficina;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class OrdemServicoControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private GestorDeTeste gestorDeTeste;

    private String tokenJwt;

    @BeforeEach
    void setUp() throws Exception {
        this.tokenJwt = gestorDeTeste.obterToken(mockMvc);
    }

    @Test
    @DisplayName("Deve registrar entrada com sucesso e gerar registro no histórico")
    void deveRegistrarEntradaComSucesso() throws Exception {
        RegistrarEntradaRequest request = RegistrarEntradaRequest.builder()
                .placa("RFL1A01")
                .modelo("Toyota Corolla Cross")
                .origemId(1L) // Localiza
                .tipoServicoId(1L) // Mecânica
                .valorOrcamento(new BigDecimal("1500.00"))
                .dataEntrada(LocalDate.now())
                .observacoes("Revisão de freios e suspensão")
                .build();

        MvcResult result = mockMvc.perform(post("/api/ordens-servico")
                        .header("Authorization", "Bearer " + tokenJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.placa").value("RFL1A01"))
                .andExpect(jsonPath("$.modelo").value("TOYOTA COROLLA CROSS"))
                .andExpect(jsonPath("$.etapa").value("AGUARDANDO_ORCAMENTO"))
                .andExpect(jsonPath("$.valorOrcamento").value(1500.00))
                .andExpect(jsonPath("$.servicoConcluido").value(false))
                .andReturn();

        OrdemServicoDTO dto = objectMapper.readValue(
                result.getResponse().getContentAsString(),
                OrdemServicoDTO.class
        );

        // Verificar histórico da OS criada
        mockMvc.perform(get("/api/ordens-servico/" + dto.getId() + "/historico")
                        .header("Authorization", "Bearer " + tokenJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].etapaNova").value("AGUARDANDO_ORCAMENTO"))
                .andExpect(jsonPath("$[0].usuarioEmail").value(gestorDeTeste.getEmail()));
    }

    @Test
    @DisplayName("Deve impedir abertura de 2 OS ativas simultâneas para o mesmo veículo (HTTP 409)")
    void deveRejeitarSegundaOsAtivaParaMesmoVeiculo() throws Exception {
        RegistrarEntradaRequest request1 = RegistrarEntradaRequest.builder()
                .placa("RFL1A02")
                .modelo("Fiat Strada Freedom")
                .origemId(2L) // Unidas
                .tipoServicoId(2L) // Funilaria
                .valorOrcamento(new BigDecimal("800.00"))
                .build();

        // 1ª Entrada - Sucesso
        mockMvc.perform(post("/api/ordens-servico")
                        .header("Authorization", "Bearer " + tokenJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request1)))
                .andExpect(status().isCreated());

        // 2ª Entrada com mesma placa enquanto a 1ª está ativa - Deve falhar com 409 Conflict
        RegistrarEntradaRequest request2 = RegistrarEntradaRequest.builder()
                .placa("RFL1A02")
                .modelo("Fiat Strada Freedom")
                .origemId(2L)
                .tipoServicoId(1L)
                .build();

        mockMvc.perform(post("/api/ordens-servico")
                        .header("Authorization", "Bearer " + tokenJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request2)))
                .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("Deve transicionar etapas e registrar data de saída automaticamente ao entregar")
    void deveTransicionarEtapasComSucesso() throws Exception {
        RegistrarEntradaRequest request = RegistrarEntradaRequest.builder()
                .placa("RFL1A03")
                .modelo("Jeep Compass Longitude")
                .origemId(3L)
                .tipoServicoId(1L)
                .valorOrcamento(new BigDecimal("2200.00"))
                .build();

        MvcResult result = mockMvc.perform(post("/api/ordens-servico")
                        .header("Authorization", "Bearer " + tokenJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();

        OrdemServicoDTO dto = objectMapper.readValue(
                result.getResponse().getContentAsString(),
                OrdemServicoDTO.class
        );

        // Mover para EM_SERVICO
        AtualizarEtapaRequest etapaEmServico = AtualizarEtapaRequest.builder()
                .novaEtapa(EtapaOrdemServico.EM_SERVICO)
                .observacao("Peças chegaram, iniciando montagem")
                .build();

        mockMvc.perform(patch("/api/ordens-servico/" + dto.getId() + "/etapa")
                        .header("Authorization", "Bearer " + tokenJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(etapaEmServico)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.etapa").value("EM_SERVICO"))
                .andExpect(jsonPath("$.servicoConcluido").value(false));

        // Mover para ENTREGUE (conclusão)
        AtualizarEtapaRequest etapaEntregue = AtualizarEtapaRequest.builder()
                .novaEtapa(EtapaOrdemServico.ENTREGUE)
                .observacao("Veículo retirado pelo cliente")
                .build();

        mockMvc.perform(patch("/api/ordens-servico/" + dto.getId() + "/etapa")
                        .header("Authorization", "Bearer " + tokenJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(etapaEntregue)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.etapa").value("ENTREGUE"))
                .andExpect(jsonPath("$.servicoConcluido").value(true))
                .andExpect(jsonPath("$.dataSaida").isNotEmpty());
    }

    @Test
    @DisplayName("Deve atualizar orçamento e registrar auditoria no histórico imutável")
    void deveAtualizarOrcamentoEAuditar() throws Exception {
        RegistrarEntradaRequest request = RegistrarEntradaRequest.builder()
                .placa("RFL1A04")
                .modelo("Hyundai HB20")
                .valorOrcamento(new BigDecimal("500.00"))
                .build();

        MvcResult result = mockMvc.perform(post("/api/ordens-servico")
                        .header("Authorization", "Bearer " + tokenJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();

        OrdemServicoDTO dto = objectMapper.readValue(
                result.getResponse().getContentAsString(),
                OrdemServicoDTO.class
        );

        // Atualizar orçamento
        AtualizarOrcamentoRequest orcamentoRequest = AtualizarOrcamentoRequest.builder()
                .valor(new BigDecimal("750.50"))
                .justificativa("Inclusão de troca da pastilha de freio traseira")
                .build();

        mockMvc.perform(patch("/api/ordens-servico/" + dto.getId() + "/orcamento")
                        .header("Authorization", "Bearer " + tokenJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(orcamentoRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valorOrcamento").value(750.50));

        // Verificar registro de auditoria no histórico
        mockMvc.perform(get("/api/ordens-servico/" + dto.getId() + "/historico")
                        .header("Authorization", "Bearer " + tokenJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].observacao").value("Valor do orçamento alterado de R$ 500.00 para R$ 750.50. Motivo: Inclusão de troca da pastilha de freio traseira"));
    }

    @Test
    @DisplayName("Deve atualizar status de faturamento com sucesso")
    void deveAtualizarFaturamento() throws Exception {
        RegistrarEntradaRequest request = RegistrarEntradaRequest.builder()
                .placa("RFL1A05")
                .modelo("Volkswagen Polo Track")
                .valorOrcamento(new BigDecimal("1200.00"))
                .build();

        MvcResult result = mockMvc.perform(post("/api/ordens-servico")
                        .header("Authorization", "Bearer " + tokenJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();

        OrdemServicoDTO dto = objectMapper.readValue(
                result.getResponse().getContentAsString(),
                OrdemServicoDTO.class
        );

        AtualizarFaturamentoRequest faturamentoRequest = AtualizarFaturamentoRequest.builder()
                .faturado(true)
                .dataFaturamento(LocalDate.now())
                .numeroNf("NF-2026-9988")
                .build();

        mockMvc.perform(patch("/api/ordens-servico/" + dto.getId() + "/faturamento")
                        .header("Authorization", "Bearer " + tokenJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(faturamentoRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.faturado").value(true))
                .andExpect(jsonPath("$.numeroNf").value("NF-2026-9988"))
                .andExpect(jsonPath("$.dataFaturamento").isNotEmpty());
    }

    @Test
    @DisplayName("Deve listar ordens de serviço filtrando por termo (placa ou modelo)")
    void deveListarOrdensComFiltros() throws Exception {
        mockMvc.perform(get("/api/ordens-servico?termo=RFL1A")
                        .header("Authorization", "Bearer " + tokenJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    private Long criarOsEntradaEm(String placa, LocalDate dataEntrada) throws Exception {
        RegistrarEntradaRequest request = RegistrarEntradaRequest.builder()
                .placa(placa)
                .modelo("Teste Data de Entrega")
                .valorOrcamento(new BigDecimal("1000.00"))
                .dataEntrada(dataEntrada)
                .build();

        MvcResult result = mockMvc.perform(post("/api/ordens-servico")
                        .header("Authorization", "Bearer " + tokenJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();

        return objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asLong();
    }

    private ResultActions transicionar(Long id, EtapaOrdemServico etapa, LocalDate dataSaida) throws Exception {
        AtualizarEtapaRequest request = AtualizarEtapaRequest.builder()
                .novaEtapa(etapa)
                .dataSaida(dataSaida)
                .build();

        return mockMvc.perform(patch("/api/ordens-servico/" + id + "/etapa")
                .header("Authorization", "Bearer " + tokenJwt)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)));
    }

    @Test
    @DisplayName("Entregar com data informada grava essa data de saída e a registra na linha do tempo")
    void deveEntregarComDataInformada() throws Exception {
        LocalDate hoje = DataOficina.hoje();
        Long id = criarOsEntradaEm("RFL2A01", hoje.minusDays(40));
        LocalDate saida = hoje.minusDays(10);

        transicionar(id, EtapaOrdemServico.ENTREGUE, saida)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.etapa").value("ENTREGUE"))
                .andExpect(jsonPath("$.dataSaida").value(saida.toString()));

        String dataBr = String.format("%02d/%02d/%d", saida.getDayOfMonth(), saida.getMonthValue(), saida.getYear());
        mockMvc.perform(get("/api/ordens-servico/" + id + "/historico")
                        .header("Authorization", "Bearer " + tokenJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].observacao").value(hasItem(containsString("Entregue em " + dataBr))));
    }

    @Test
    @DisplayName("Entregar sem informar a data usa hoje, no fuso da oficina")
    void deveEntregarSemDataUsandoHoje() throws Exception {
        Long id = criarOsEntradaEm("RFL2A02", DataOficina.hoje().minusDays(3));

        transicionar(id, EtapaOrdemServico.ENTREGUE, null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.dataSaida").value(DataOficina.hoje().toString()));
    }

    @Test
    @DisplayName("Data de entrega antes da entrada do veículo é rejeitada com 400")
    void deveRejeitarEntregaAntesDaEntrada() throws Exception {
        LocalDate hoje = DataOficina.hoje();
        Long id = criarOsEntradaEm("RFL2A03", hoje.minusDays(5));

        transicionar(id, EtapaOrdemServico.ENTREGUE, hoje.minusDays(6))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Data de entrega no futuro é rejeitada com 400")
    void deveRejeitarEntregaNoFuturo() throws Exception {
        Long id = criarOsEntradaEm("RFL2A04", DataOficina.hoje().minusDays(5));

        transicionar(id, EtapaOrdemServico.ENTREGUE, DataOficina.hoje().plusDays(1))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Data de saída só vale para a etapa Entregue")
    void deveRejeitarDataDeSaidaEmOutraEtapa() throws Exception {
        Long id = criarOsEntradaEm("RFL2A05", DataOficina.hoje().minusDays(5));

        transicionar(id, EtapaOrdemServico.EM_SERVICO, DataOficina.hoje())
                .andExpect(status().isBadRequest());
    }
}
