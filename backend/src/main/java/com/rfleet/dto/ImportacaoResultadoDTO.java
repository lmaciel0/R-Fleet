package com.rfleet.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ImportacaoResultadoDTO {

    private int totalLinhasLidas;
    private int totalImportadas;
    private int totalIgnoradas;
    private int totalErros;

    @Builder.Default
    private List<String> mensagens = new ArrayList<>();
}
