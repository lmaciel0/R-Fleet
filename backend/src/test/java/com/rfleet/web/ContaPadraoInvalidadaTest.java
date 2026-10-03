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
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

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

    @Autowired
    private PasswordEncoder passwordEncoder;

    private void loginDeveFalhar(String email, String senha) throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(LoginRequest.builder()
                                .email(email)
                                .senha(senha)
                                .build())))
                .andExpect(status().isUnauthorized());
    }

    /** Hash BCrypt semeado pela V2, lido do próprio arquivo da migration (não é repetido no código). */
    private static String hashVazadoDaV2() throws IOException {
        String sql = new ClassPathResource("db/migration/V2__dados_iniciais_padrao.sql")
                .getContentAsString(StandardCharsets.UTF_8);
        Matcher hash = Pattern.compile("'(\\$2[aby]\\$\\d{2}\\$[./A-Za-z0-9]{53})'").matcher(sql);
        assertThat(hash.find()).as("hash BCrypt na V2").isTrue();
        return hash.group(1);
    }

    /** Vale tanto com a conta ainda revogada quanto depois de o gestor cadastrar uma senha nova nela. */
    private void assertSenhaVazadaRevogada(Usuario padrao) throws IOException {
        assertThat(padrao.getSenhaHash()).isNotEqualTo(hashVazadoDaV2());
    }

    @Test
    @DisplayName("A senha do gestor semeado pela V2 (pública no repositório) está revogada")
    void senhaDoGestorPadraoEstaInvalidada() throws Exception {
        Usuario padrao = usuarioRepository.findById(ID_GESTOR_PADRAO).orElseThrow();

        assertSenhaVazadaRevogada(padrao);

        loginDeveFalhar(padrao.getEmail(), "qualquer-" + UUID.randomUUID());
        // O próprio marcador também não funciona como senha
        loginDeveFalhar(padrao.getEmail(), Usuario.SENHA_INVALIDADA);
    }

    @Test
    @DisplayName("A revogação continua valendo depois que o gestor recadastra a conta antiga pelo .env")
    void revogacaoContinuaDepoisDeRecadastrarAContaAntiga() throws Exception {
        // Estado da máquina de quem seguiu o README: GestorInicial gravou uma senha nova nessa conta
        Usuario padrao = usuarioRepository.findById(ID_GESTOR_PADRAO).orElseThrow();
        padrao.setSenhaHash(passwordEncoder.encode("Nova-" + UUID.randomUUID()));
        usuarioRepository.saveAndFlush(padrao);

        assertSenhaVazadaRevogada(padrao);
    }
}
