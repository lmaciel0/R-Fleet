package com.rfleet.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rfleet.dto.LoginRequest;
import com.rfleet.dto.LoginResponse;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @DisplayName("Deve autenticar com sucesso o gestor usando email e senha corretos")
    void deveAutenticarComSucessoComCredenciaisCorretas() throws Exception {
        LoginRequest request = LoginRequest.builder()
                .email("gestor@exemplo.com")
                .senha("senha-de-teste")
                .build();

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isString())
                .andExpect(jsonPath("$.tipo").value("Bearer"))
                .andExpect(jsonPath("$.usuario.email").value("gestor@exemplo.com"))
                .andExpect(jsonPath("$.usuario.nome").value("Gestor"))
                .andExpect(jsonPath("$.usuario.ativo").value(true));
    }

    @Test
    @DisplayName("Deve rejeitar login com senha incorreta retornando 401")
    void deveRejeitarLoginComSenhaIncorreta() throws Exception {
        LoginRequest request = LoginRequest.builder()
                .email("gestor@exemplo.com")
                .senha("senha_errada_123")
                .build();

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.mensagem").value("E-mail ou senha inválidos."));
    }

    @Test
    @DisplayName("Deve rejeitar login com email não cadastrado retornando 401")
    void deveRejeitarLoginComUsuarioInexistente() throws Exception {
        LoginRequest request = LoginRequest.builder()
                .email("desconhecido@oficina.com")
                .senha("senha-de-teste")
                .build();

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Deve rejeitar acesso ao /api/auth/me sem token JWT")
    void deveRejeitarAcessoSemToken() throws Exception {
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Deve retornar dados do usuário autenticado no /api/auth/me com token válido")
    void deveRetornarDadosDoUsuarioAutenticadoComTokenValido() throws Exception {
        // 1. Fazer login para obter o token
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
        String token = loginResponse.getToken();
        assertNotNull(token);

        // 2. Chamar /api/auth/me com o Bearer token
        mockMvc.perform(get("/api/auth/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("gestor@exemplo.com"))
                .andExpect(jsonPath("$.nome").value("Gestor"))
                .andExpect(jsonPath("$.ativo").value(true));
    }
}
