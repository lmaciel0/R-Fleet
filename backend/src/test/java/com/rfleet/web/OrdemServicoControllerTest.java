package com.rfleet.web;

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

import java.math.BigDecimal;
import java.time.LocalDate;

import org.springframework.transaction.annotation.Transactional;

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
                .andExpect(jsonPath("$[0].usuarioEmail").value("gestor@exemplo.com"));
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
}
