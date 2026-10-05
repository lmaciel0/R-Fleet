package com.rfleet.service;

import com.rfleet.dto.OrdemServicoDTO;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class ExportadorServiceTest {

    private final ExportadorService exportador = new ExportadorService();

    private String csvDe(OrdemServicoDTO ordem) {
        return new String(exportador.exportarCsv(List.of(ordem)), StandardCharsets.UTF_8);
    }

    private OrdemServicoDTO.OrdemServicoDTOBuilder ordemBase() {
        return OrdemServicoDTO.builder().id(1L).placa("ABC1D23").modelo("Fiat Argo");
    }

    @Test
    @DisplayName("CSV: texto que começaria uma fórmula (= + - @) sai com apóstrofo na frente")
    void neutralizaFormulaNoCsv() {
        String csv = csvDe(ordemBase()
                .observacoes("=HYPERLINK(\"http://exemplo.invalid\";\"clique\")")
                .numeroNf("+55 11 99999-0000")
                .modelo("-2+3")
                .build());

        assertThat(csv)
                .contains("'-2+3")
                .contains("'+55 11 99999-0000")
                .contains("\"'=HYPERLINK(\"\"http://exemplo.invalid\"\";\"\"clique\"\")\"")
                .doesNotContain(";=HYPERLINK")
                .doesNotContain(";+55")
                .doesNotContain(";-2+3");
    }

    @Test
    @DisplayName("CSV: texto comum fica como está")
    void textoComumNaoMuda() {
        String csv = csvDe(ordemBase().observacoes("Troca de amortecedores - lado esquerdo").build());

        assertThat(csv).contains("Troca de amortecedores - lado esquerdo").doesNotContain("'Troca");
    }
}
