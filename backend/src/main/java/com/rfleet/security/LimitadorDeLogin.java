package com.rfleet.security;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/**
 * Trava o login de um e-mail depois de {@code max-falhas} senhas erradas dentro da janela.
 * A chave é o e-mail, não o IP: atrás do proxy do Render o IP de origem não é confiável.
 * Fica em memória, o que basta para uma instância só (zera quando a API reinicia ou dorme).
 * Quem digita o e-mail de outra pessoa pode travar essa conta pela duração da janela; é o preço de
 * barrar tentativa em massa sem bloqueio permanente.
 */
@Component
public class LimitadorDeLogin {

    /** Teto de e-mails distintos guardados, para que tentativas com e-mails inventados não encham a memória. */
    private static final int LIMITE_DE_CHAVES = 10_000;
    private static final int TAMANHO_MAXIMO_CHAVE = 150;

    private final int maxFalhas;
    private final Duration janela;
    private final Clock relogio;
    private final Map<String, Registro> registros = new HashMap<>();

    @Autowired
    public LimitadorDeLogin(
            @Value("${app.login.max-falhas:5}") int maxFalhas,
            @Value("${app.login.janela-minutos:15}") long janelaMinutos
    ) {
        this(maxFalhas, Duration.ofMinutes(janelaMinutos), Clock.systemUTC());
    }

    LimitadorDeLogin(int maxFalhas, Duration janela, Clock relogio) {
        this.maxFalhas = maxFalhas;
        this.janela = janela;
        this.relogio = relogio;
    }

    /** Lança {@link MuitasTentativasException} se o e-mail está travado. */
    public synchronized void verificar(String email) {
        String chave = chave(email);
        Registro registro = registros.get(chave);
        if (registro == null) {
            return;
        }
        Instant agora = relogio.instant();
        if (registro.expirou(agora, janela)) {
            registros.remove(chave);
            return;
        }
        if (registro.falhas >= maxFalhas) {
            long restante = Duration.between(agora, registro.inicio.plus(janela)).toSeconds();
            throw new MuitasTentativasException(Math.max(1, restante));
        }
    }

    public synchronized void registrarFalha(String email) {
        String chave = chave(email);
        Instant agora = relogio.instant();
        Registro registro = registros.get(chave);

        if (registro == null || registro.expirou(agora, janela)) {
            if (registro == null && registros.size() >= LIMITE_DE_CHAVES) {
                registros.values().removeIf(r -> r.expirou(agora, janela));
                if (registros.size() >= LIMITE_DE_CHAVES) {
                    return;
                }
            }
            registro = new Registro(agora);
            registros.put(chave, registro);
        }
        registro.falhas++;
    }

    public synchronized void limpar(String email) {
        registros.remove(chave(email));
    }

    private static String chave(String email) {
        String normalizado = email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
        return normalizado.length() > TAMANHO_MAXIMO_CHAVE ? normalizado.substring(0, TAMANHO_MAXIMO_CHAVE) : normalizado;
    }

    private static final class Registro {
        private final Instant inicio;
        private int falhas;

        private Registro(Instant inicio) {
            this.inicio = inicio;
        }

        private boolean expirou(Instant agora, Duration janela) {
            return !agora.isBefore(inicio.plus(janela));
        }
    }
}
