package com.rfleet.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rfleet.domain.Usuario;
import com.rfleet.dto.LoginRequest;
import com.rfleet.repository.UsuarioRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ContaPadraoInvalidadaTest {

    private static final UUID ID_GESTOR_PADRAO = UUID.fromString("a0000000-0000-0000-0000-000000000001");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UsuarioRepository usuarioRepository;

    private void loginDeveFalhar(String email, String senha) throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(LoginRequest.builder()
                                .email(email)
                                .senha(senha)
                                .build())))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("A senha do gestor semeado pela V2 (pública no repositório) está revogada")
    void senhaDoGestorPadraoEstaInvalidada() throws Exception {
        Usuario padrao = usuarioRepository.findById(ID_GESTOR_PADRAO).orElseThrow();

        assertThat(padrao.getSenhaHash()).isEqualTo(Usuario.SENHA_INVALIDADA);

        loginDeveFalhar(padrao.getEmail(), "qualquer-" + UUID.randomUUID());
        // O próprio marcador também não funciona como senha
        loginDeveFalhar(padrao.getEmail(), Usuario.SENHA_INVALIDADA);
    }
}
