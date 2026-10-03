package com.rfleet.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rfleet.support.GestorDeTeste;
import com.rfleet.dto.SalvarOrigemRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class OrigemControllerTest {

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
    @DisplayName("Deve listar origens padrão pré-carregadas pelo Flyway")
    void deveListarOrigensPadrao() throws Exception {
        mockMvc.perform(get("/api/origens")
                        .header("Authorization", "Bearer " + tokenJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[?(@.nome == 'Movida')]").exists())
                .andExpect(jsonPath("$[?(@.nome == 'Unidas')]").exists());
    }

    @Test
    @DisplayName("Deve cadastrar uma nova origem personalizada com sucesso")
    void deveCadastrarNovaOrigem() throws Exception {
        SalvarOrigemRequest request = SalvarOrigemRequest.builder()
                .nome("Localiza Rent a Car")
                .ativo(true)
                .build();

        mockMvc.perform(post("/api/origens")
                        .header("Authorization", "Bearer " + tokenJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.nome").value("Localiza Rent a Car"))
                .andExpect(jsonPath("$.ativo").value(true));
    }
}
