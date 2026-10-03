package com.rfleet.security;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.security.SecureRandom;
import java.util.Base64;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtServiceTest {

    private static final String MENSAGEM = "JWT_SECRET ausente ou fraco: gere com \"openssl rand -base64 64\" (veja .env.example).";

    private static String chaveAleatoria(int bytes) {
        byte[] chave = new byte[bytes];
        new SecureRandom().nextBytes(chave);
        return Base64.getEncoder().encodeToString(chave);
    }

    @Test
    @DisplayName("Recusa chave ausente")
    void recusaChaveAusente() {
        assertThatThrownBy(() -> new JwtService("", 3_600_000))
                .isInstanceOf(IllegalStateException.class).hasMessage(MENSAGEM);
    }

    @Test
    @DisplayName("Recusa chave que não é Base64")
    void recusaChaveInvalida() {
        assertThatThrownBy(() -> new JwtService("isto não é base64 !!!", 3_600_000))
                .isInstanceOf(IllegalStateException.class).hasMessage(MENSAGEM);
    }

    @Test
    @DisplayName("Recusa chave com menos de 256 bits")
    void recusaChaveCurta() {
        assertThatThrownBy(() -> new JwtService(chaveAleatoria(16), 3_600_000))
                .isInstanceOf(IllegalStateException.class).hasMessage(MENSAGEM);
    }

    @Test
    @DisplayName("Aceita chave forte e emite token válido")
    void aceitaChaveForte() {
        JwtService jwtService = new JwtService(chaveAleatoria(64), 3_600_000);

        String token = jwtService.generateToken("gestor@rfleet.local", Map.of());

        assertThat(jwtService.extractUsername(token)).isEqualTo("gestor@rfleet.local");
    }
}
