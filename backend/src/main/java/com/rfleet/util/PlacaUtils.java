package com.rfleet.util;

import java.util.regex.Pattern;

public final class PlacaUtils {

    private static final Pattern PADRAO_TRADICIONAL = Pattern.compile("^[A-Z]{3}[0-9]{4}$");
    private static final Pattern PADRAO_MERCOSUL = Pattern.compile("^[A-Z]{3}[0-9][A-Z][0-9]{2}$");

    private PlacaUtils() {
    }

    public static String sanitizar(String placa) {
        if (placa == null) {
            return "";
        }
        return placa.replaceAll("[^A-Za-z0-9]", "").toUpperCase().trim();
    }

    public static boolean isValida(String placa) {
        String sanitizada = sanitizar(placa);
        if (sanitizada.length() != 7) {
            return false;
        }
        return PADRAO_TRADICIONAL.matcher(sanitizada).matches() || PADRAO_MERCOSUL.matcher(sanitizada).matches();
    }

    public static boolean isMercosul(String placa) {
        String sanitizada = sanitizar(placa);
        return PADRAO_MERCOSUL.matcher(sanitizada).matches();
    }

    public static String formatar(String placa) {
        String sanitizada = sanitizar(placa);
        if (sanitizada.length() != 7) {
            return sanitizada;
        }

        if (PADRAO_TRADICIONAL.matcher(sanitizada).matches()) {
            return sanitizada.substring(0, 3) + "-" + sanitizada.substring(3);
        }

        // Padrão Mercosul (ex: ABC1D23)
        return sanitizada;
    }
}
