package com.rfleet.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rfleet.dto.LoginRequest;
import com.rfleet.dto.LoginResponse;
import com.rfleet.dto.SalvarVeiculoRequest;
import com.rfleet.repository.VeiculoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class VeiculoControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private VeiculoRepository veiculoRepository;

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
    @DisplayName("Deve cadastrar veículo e buscar por placa com sucesso")
    void deveCadastrarEBuscarVeiculoPorPlaca() throws Exception {
        SalvarVeiculoRequest request = SalvarVeiculoRequest.builder()
                .placa("BRA2E19")
                .modelo("Chevrolet Tracker 1.2 Turbo")
                .origemId(5L) // Movida
                .build();

        // 1. Cadastrar
        mockMvc.perform(post("/api/veiculos")
                        .header("Authorization", "Bearer " + tokenJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.placa").value("BRA2E19"))
                .andExpect(jsonPath("$.modelo").value("CHEVROLET TRACKER 1.2 TURBO"))
                .andExpect(jsonPath("$.mercosul").value(true));

        // 2. Buscar por placa digitada com traço e minúsculas (ex: bra-2e19)
        mockMvc.perform(get("/api/veiculos/buscar-placa/bra-2e19")
                        .header("Authorization", "Bearer " + tokenJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.encontrado").value(true))
                .andExpect(jsonPath("$.placa").value("BRA2E19"))
                .andExpect(jsonPath("$.modelo").value("CHEVROLET TRACKER 1.2 TURBO"))
                .andExpect(jsonPath("$.possuiOsAtiva").value(false));
    }

    @Test
    @DisplayName("Deve retornar encontrado=false para placa ainda não cadastrada")
    void deveRetornarEncontradoFalsoParaPlacaInexistente() throws Exception {
        mockMvc.perform(get("/api/veiculos/buscar-placa/XYZ9988")
                        .header("Authorization", "Bearer " + tokenJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.encontrado").value(false))
                .andExpect(jsonPath("$.placa").value("XYZ9988"))
                .andExpect(jsonPath("$.placaFormatada").value("XYZ-9988"))
                .andExpect(jsonPath("$.possuiOsAtiva").value(false));
    }

    @Test
    @DisplayName("Deve rejeitar busca com formato de placa inválido retornando 400")
    void deveRejeitarPlacaInvalida() throws Exception {
        mockMvc.perform(get("/api/veiculos/buscar-placa/PLACAINVALIDA123")
                        .header("Authorization", "Bearer " + tokenJwt))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Deve listar veículos com filtro por termo")
    void deveListarVeiculosPorTermo() throws Exception {
        mockMvc.perform(get("/api/veiculos?termo=Tracker")
                        .header("Authorization", "Bearer " + tokenJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }
}
