package com.rfleet.util;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class TiposDeAnexoTest {

    @Test
    @DisplayName("O tipo vem da extensão, sem diferenciar maiúsculas")
    void tipoPelaExtensao() {
        assertThat(TiposDeAnexo.tipoPorNome("laudo.PDF")).contains("application/pdf");
        assertThat(TiposDeAnexo.tipoPorNome("foto.JPeG")).contains("image/jpeg");
        assertThat(TiposDeAnexo.tipoPorNome("planilha.xlsx"))
                .contains("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    }

    @Test
    @DisplayName("Extensões que o navegador executa ou interpreta não são aceitas")
    void extensoesNaoPermitidas() {
        assertThat(TiposDeAnexo.tipoPorNome("pagina.html")).isEmpty();
        assertThat(TiposDeAnexo.tipoPorNome("desenho.svg")).isEmpty();
        assertThat(TiposDeAnexo.tipoPorNome("script.js")).isEmpty();
        assertThat(TiposDeAnexo.tipoPorNome("programa.exe")).isEmpty();
        assertThat(TiposDeAnexo.tipoPorNome("semextensao")).isEmpty();
        assertThat(TiposDeAnexo.tipoPorNome("termina.com.ponto.")).isEmpty();
        assertThat(TiposDeAnexo.tipoPorNome(null)).isEmpty();
    }

    @Test
    @DisplayName("Só a última extensão vale: laudo.pdf.html não passa por PDF")
    void soAUltimaExtensao() {
        assertThat(TiposDeAnexo.tipoPorNome("laudo.pdf.html")).isEmpty();
    }

    @Test
    @DisplayName("Anexo antigo de tipo desconhecido é servido como binário genérico")
    void downloadDeTipoDesconhecido() {
        assertThat(TiposDeAnexo.tipoParaDownload("antigo.html")).isEqualTo("application/octet-stream");
        assertThat(TiposDeAnexo.tipoParaDownload("nota.pdf")).isEqualTo("application/pdf");
    }

    @Test
    @DisplayName("Nome seguro tira caminho, aspas e caracteres de controle")
    void nomeSeguro() {
        assertThat(TiposDeAnexo.nomeSeguro("../../etc/passwd.pdf")).isEqualTo("passwd.pdf");
        assertThat(TiposDeAnexo.nomeSeguro("C:\\fotos\\carro.jpg")).isEqualTo("carro.jpg");
        assertThat(TiposDeAnexo.nomeSeguro("laudo\"; x=\".pdf")).isEqualTo("laudo_; x=_.pdf");
        assertThat(TiposDeAnexo.nomeSeguro("a\r\nSet-Cookie: x.pdf")).doesNotContain("\r", "\n");
        assertThat(TiposDeAnexo.nomeSeguro("orçamento.pdf")).isEqualTo("orçamento.pdf");
    }

    @Test
    @DisplayName("Nome vazio ou só de ponto vira \"arquivo\"")
    void nomeVazio() {
        assertThat(TiposDeAnexo.nomeSeguro(null)).isEqualTo("arquivo");
        assertThat(TiposDeAnexo.nomeSeguro("")).isEqualTo("arquivo");
        assertThat(TiposDeAnexo.nomeSeguro("..")).isEqualTo("arquivo");
        assertThat(TiposDeAnexo.nomeSeguro("pasta/")).isEqualTo("arquivo");
    }

    @Test
    @DisplayName("Nome longo é cortado para caber na coluna, mantendo a extensão")
    void nomeLongo() {
        String nome = TiposDeAnexo.nomeSeguro("a".repeat(400) + ".pdf");

        assertThat(nome).hasSize(200).endsWith(".pdf");
    }
}
