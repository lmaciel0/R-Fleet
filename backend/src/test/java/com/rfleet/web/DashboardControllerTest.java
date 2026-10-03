package com.rfleet.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rfleet.dto.LoginRequest;
import com.rfleet.dto.LoginResponse;
import com.rfleet.dto.RegistrarEntradaRequest;
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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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

    private String tokenJwt;

    @BeforeEach
    void setUp() throws Exception {
        LoginRequest loginRequest = LoginRequest.builder()
                .email("rodrigoaffalcao@gmail.com")
                .senha("rfleet99")
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
    }

    @Test
    @DisplayName("Deve calcular e retornar métricas operacionais e financeiras do dashboard")
    void deveRetornarMetricasDashboard() throws Exception {
        mockMvc.perform(get("/api/dashboard/metricas")
                        .header("Authorization", "Bearer " + tokenJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalVeiculosPatio").isNumber())
                .andExpect(jsonPath("$.veiculosEmAtraso").isNumber())
                .andExpect(jsonPath("$.tempoMedioPatioDias").isNumber())
                .andExpect(jsonPath("$.totalOrcadoPatio").isNumber())
                .andExpect(jsonPath("$.distribuicaoPorEtapa").isMap())
                .andExpect(jsonPath("$.distribuicaoPorEtapa.AGUARDANDO_ORCAMENTO").isNumber())
                .andExpect(jsonPath("$.distribuicaoPorEtapa.EM_SERVICO").isNumber())
                .andExpect(jsonPath("$.distribuicaoPorEtapa.ENTREGUE").isNumber())
                .andExpect(jsonPath("$.limiteSlaDias").value(5));
    }
}
