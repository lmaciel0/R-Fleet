package com.rfleet.util;

import java.time.LocalDate;
import java.time.ZoneId;

/**
 * Datas no fuso da oficina (America/Sao_Paulo), independente do fuso do servidor.
 */
public final class DataOficina {

    public static final ZoneId ZONA = ZoneId.of("America/Sao_Paulo");

    private DataOficina() {
    }

    public static LocalDate hoje() {
        return LocalDate.now(ZONA);
    }

    public static LocalDate inicioDoMesCorrente() {
        return hoje().withDayOfMonth(1);
    }
}
