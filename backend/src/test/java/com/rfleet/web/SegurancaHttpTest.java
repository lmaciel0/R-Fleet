package com.rfleet.web;

import com.rfleet.support.GestorDeTeste;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class SegurancaHttpTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private GestorDeTeste gestorDeTeste;

    @Test
    @DisplayName("Token na URL (?token=) não autentica; só o cabeçalho Authorization")
    void tokenSoPeloCabecalho() throws Exception {
        String token = gestorDeTeste.obterToken(mockMvc);

        mockMvc.perform(get("/api/auth/me").param("token", token))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("CORS recusa origem fora da lista configurada")
    void corsRecusaOrigemDesconhecida() throws Exception {
        mockMvc.perform(options("/api/auth/me")
                        .header("Origin", "http://evil.example")
                        .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isForbidden())
                .andExpect(header().doesNotExist("Access-Control-Allow-Origin"));
    }

    @Test
    @DisplayName("CORS permite a origem configurada e expõe Content-Disposition")
    void corsPermiteOrigemConfigurada() throws Exception {
        mockMvc.perform(options("/api/auth/me")
                        .header("Origin", "http://localhost:5174")
                        .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5174"));

        String token = gestorDeTeste.obterToken(mockMvc);
        mockMvc.perform(get("/api/auth/me")
                        .header("Origin", "http://localhost:5174")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Expose-Headers", containsString("Content-Disposition")));
    }
}
