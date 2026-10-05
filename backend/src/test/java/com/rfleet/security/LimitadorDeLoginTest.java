package com.rfleet.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class LimitadorDeLoginTest {

    private static final String EMAIL = "gestor@exemplo.com";

    private RelogioManual relogio;
    private LimitadorDeLogin limitador;

    @BeforeEach
    void preparar() {
        relogio = new RelogioManual();
        limitador = new LimitadorDeLogin(3, Duration.ofMinutes(15), relogio);
    }

    private void falhar(String email, int vezes) {
        for (int i = 0; i < vezes; i++) {
            limitador.verificar(email);
            limitador.registrarFalha(email);
        }
    }

    @Test
    @DisplayName("Abaixo do limite de falhas o login segue liberado")
    void abaixoDoLimite() {
        falhar(EMAIL, 2);

        assertThatCode(() -> limitador.verificar(EMAIL)).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("Ao atingir o limite, trava e informa quanto falta")
    void travaNoLimite() {
        falhar(EMAIL, 3);
        relogio.avancar(Duration.ofMinutes(5));

        assertThatThrownBy(() -> limitador.verificar(EMAIL))
                .isInstanceOf(MuitasTentativasException.class)
                .satisfies(e -> assertThat(((MuitasTentativasException) e).getSegundosRestantes()).isEqualTo(10 * 60));
    }

    @Test
    @DisplayName("Terminada a janela, o e-mail volta a poder tentar")
    void liberaDepoisDaJanela() {
        falhar(EMAIL, 3);
        relogio.avancar(Duration.ofMinutes(15));

        assertThatCode(() -> limitador.verificar(EMAIL)).doesNotThrowAnyException();
        limitador.registrarFalha(EMAIL);
        assertThatCode(() -> limitador.verificar(EMAIL)).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("Login certo zera a contagem de falhas")
    void sucessoZeraContagem() {
        falhar(EMAIL, 2);
        limitador.limpar(EMAIL);
        falhar(EMAIL, 2);

        assertThatCode(() -> limitador.verificar(EMAIL)).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("A contagem é por e-mail, sem diferenciar maiúsculas e espaços")
    void contagemPorEmail() {
        falhar("Gestor@Exemplo.com ", 3);

        assertThatThrownBy(() -> limitador.verificar(EMAIL)).isInstanceOf(MuitasTentativasException.class);
        assertThatCode(() -> limitador.verificar("outro@exemplo.com")).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("Tentativa enquanto travado não prolonga o bloqueio")
    void tentativaTravadaNaoProlonga() {
        falhar(EMAIL, 3);
        relogio.avancar(Duration.ofMinutes(10));
        assertThatThrownBy(() -> limitador.verificar(EMAIL)).isInstanceOf(MuitasTentativasException.class);

        relogio.avancar(Duration.ofMinutes(5));

        assertThatCode(() -> limitador.verificar(EMAIL)).doesNotThrowAnyException();
    }

    private static final class RelogioManual extends Clock {
        private Instant agora = Instant.parse("2026-10-05T12:00:00Z");

        void avancar(Duration tempo) {
            agora = agora.plus(tempo);
        }

        @Override
        public java.time.ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(java.time.ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return agora;
        }
    }
}
