package com.rfleet.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Origens digitadas à mão no painel do Render: barra no final e espaço depois da vírgula. */
@SpringBootTest(properties = "app.cors.allowed-origins=https://rfleet-web.onrender.com/ ,  http://localhost:5174")
@AutoConfigureMockMvc
class CorsOrigensTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("Aceita a origem configurada com barra no final")
    void aceitaOrigemComBarraNoFinal() throws Exception {
        mockMvc.perform(options("/api/auth/login")
                        .header("Origin", "https://rfleet-web.onrender.com")
                        .header("Access-Control-Request-Method", "POST"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "https://rfleet-web.onrender.com"));
    }

    @Test
    @DisplayName("Aceita a origem que vem depois de espaços na lista")
    void aceitaOrigemDepoisDeEspacos() throws Exception {
        mockMvc.perform(options("/api/auth/login")
                        .header("Origin", "http://localhost:5174")
                        .header("Access-Control-Request-Method", "POST"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5174"));
    }
}
