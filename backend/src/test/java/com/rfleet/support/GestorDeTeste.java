package com.rfleet.support;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rfleet.domain.Usuario;
import com.rfleet.dto.LoginRequest;
import com.rfleet.dto.LoginResponse;
import com.rfleet.repository.UsuarioRepository;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Cria um gestor com e-mail e senha aleatórios dentro da transação do teste (desfeita ao final)
 * e faz o login real por /api/auth/login. Nenhuma credencial fixa no código de teste.
 */
@Component
public class GestorDeTeste {

    public static final String NOME = "Gestor de Teste";

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final ObjectMapper objectMapper;

    private String email;
    private String senha;

    public GestorDeTeste(UsuarioRepository usuarioRepository, PasswordEncoder passwordEncoder, ObjectMapper objectMapper) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
        this.objectMapper = objectMapper;
    }

    /** Deve ser chamado dentro de um teste @Transactional. */
    public String obterToken(MockMvc mockMvc) throws Exception {
        this.email = "gestor.teste." + UUID.randomUUID() + "@rfleet.local";
        this.senha = UUID.randomUUID().toString();

        usuarioRepository.saveAndFlush(Usuario.builder()
                .nome(NOME)
                .email(email)
                .senhaHash(passwordEncoder.encode(senha))
                .ativo(true)
                .build());

        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(LoginRequest.builder()
                                .email(email)
                                .senha(senha)
                                .build())))
                .andExpect(status().isOk())
                .andReturn();

        return objectMapper.readValue(result.getResponse().getContentAsString(), LoginResponse.class).getToken();
    }

    public String getEmail() {
        return email;
    }

    public String getSenha() {
        return senha;
    }
}
