package com.rfleet.web;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.util.unit.DataSize;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class RestExceptionHandlerTest {

    @Test
    @DisplayName("Upload acima do limite do servidor vira 413 com mensagem em português")
    void uploadAcimaDoLimiteDoServidor() {
        RestExceptionHandler handler = new RestExceptionHandler(DataSize.ofMegabytes(8));

        ResponseEntity<Map<String, Object>> resposta =
                handler.handleMaxUploadSize(new MaxUploadSizeExceededException(DataSize.ofMegabytes(8).toBytes()));

        assertThat(resposta.getStatusCode().value()).isEqualTo(413);
        assertThat(resposta.getBody()).containsEntry("mensagem", "O arquivo excede o tamanho máximo permitido de 8 MB.");
    }
}
