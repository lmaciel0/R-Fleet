package com.rfleet.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rfleet.dto.LoginRequest;
import com.rfleet.support.GestorDeTeste;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private GestorDeTeste gestorDeTeste;

    @Test
    @DisplayName("Deve autenticar com sucesso o gestor usando email e senha corretos")
    void deveAutenticarComSucessoComCredenciaisCorretas() throws Exception {
        gestorDeTeste.obterToken(mockMvc);

        LoginRequest request = LoginRequest.builder()
                .email(gestorDeTeste.getEmail())
                .senha(gestorDeTeste.getSenha())
                .build();

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isString())
                .andExpect(jsonPath("$.tipo").value("Bearer"))
                .andExpect(jsonPath("$.usuario.email").value(gestorDeTeste.getEmail()))
                .andExpect(jsonPath("$.usuario.nome").value(GestorDeTeste.NOME))
                .andExpect(jsonPath("$.usuario.ativo").value(true));
    }

    @Test
    @DisplayName("Deve rejeitar login com senha incorreta retornando 401")
    void deveRejeitarLoginComSenhaIncorreta() throws Exception {
        gestorDeTeste.obterToken(mockMvc);

        LoginRequest request = LoginRequest.builder()
                .email(gestorDeTeste.getEmail())
                .senha("errada-" + UUID.randomUUID())
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
                .email("desconhecido." + UUID.randomUUID() + "@oficina.com")
                .senha(UUID.randomUUID().toString())
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
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Deve retornar dados do usuário autenticado no /api/auth/me com token válido")
    void deveRetornarDadosDoUsuarioAutenticadoComTokenValido() throws Exception {
        String token = gestorDeTeste.obterToken(mockMvc);

        mockMvc.perform(get("/api/auth/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(gestorDeTeste.getEmail()))
                .andExpect(jsonPath("$.nome").value(GestorDeTeste.NOME))
                .andExpect(jsonPath("$.ativo").value(true));
    }
}
