package com.rfleet.util;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class PlacaUtilsTest {

    @Test
    @DisplayName("Deve sanitizar placa removendo traços, espaços e convertendo para maiúsculas")
    void deveSanitizarPlaca() {
        assertEquals("ABC1234", PlacaUtils.sanitizar("abc-1234"));
        assertEquals("BRA2E19", PlacaUtils.sanitizar(" bra2e19 "));
        assertEquals("XYZ9999", PlacaUtils.sanitizar("xyz.9999"));
        assertEquals("", PlacaUtils.sanitizar(null));
    }

    @Test
    @DisplayName("Deve validar placas no formato tradicional e Mercosul")
    void deveValidarPlacasCorretas() {
        assertTrue(PlacaUtils.isValida("ABC-1234"));
        assertTrue(PlacaUtils.isValida("ABC1234"));
        assertTrue(PlacaUtils.isValida("BRA2E19"));
        assertTrue(PlacaUtils.isValida("bra2e19"));
        assertTrue(PlacaUtils.isValida("RIO2A18"));
    }

    @Test
    @DisplayName("Deve rejeitar formatos inválidos de placa")
    void deveRejeitarPlacasInvalidas() {
        assertFalse(PlacaUtils.isValida("ABC123"));      // Curta demais
        assertFalse(PlacaUtils.isValida("ABC12345"));    // Longa demais
        assertFalse(PlacaUtils.isValida("1234ABC"));     // Números na frente
        assertFalse(PlacaUtils.isValida("ABCD123"));     // Quatro letras na frente
        assertFalse(PlacaUtils.isValida("ABC12D3"));     // Letra na posição errada
        assertFalse(PlacaUtils.isValida(null));
        assertFalse(PlacaUtils.isValida(""));
    }

    @Test
    @DisplayName("Deve identificar corretamente se a placa é padrão Mercosul")
    void deveIdentificarPadraoMercosul() {
        assertTrue(PlacaUtils.isMercosul("BRA2E19"));
        assertTrue(PlacaUtils.isMercosul("RIO2A18"));
        assertFalse(PlacaUtils.isMercosul("ABC-1234"));
        assertFalse(PlacaUtils.isMercosul("ABC1234"));
    }

    @Test
    @DisplayName("Deve formatar adequadamente placas antigas com traço e manter Mercosul")
    void deveFormatarPlacas() {
        assertEquals("ABC-1234", PlacaUtils.formatar("abc1234"));
        assertEquals("BRA2E19", PlacaUtils.formatar("bra2e19"));
    }
}
