package com.rfleet.security;

/** Login bloqueado por excesso de tentativas erradas; vira HTTP 429 com Retry-After. */
public class MuitasTentativasException extends RuntimeException {

    private final long segundosRestantes;

    public MuitasTentativasException(long segundosRestantes) {
        super("Muitas tentativas de login.");
        this.segundosRestantes = segundosRestantes;
    }

    public long getSegundosRestantes() {
        return segundosRestantes;
    }
}
