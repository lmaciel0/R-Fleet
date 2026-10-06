package com.rfleet.dto;

import com.rfleet.validation.ValidPlaca;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Correção dos dados lançados na entrada. Vale como substituição: os quatro campos vêm sempre,
 * e origem/tipo de serviço nulos limpam o campo.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AtualizarDadosVeiculoRequest {

    @NotBlank(message = "A placa do veículo é obrigatória")
    @ValidPlaca
    private String placa;

    @NotBlank(message = "O modelo do veículo é obrigatório")
    @Size(max = 100, message = "O modelo não pode ultrapassar 100 caracteres")
    private String modelo;

    private Long origemId;

    private Long tipoServicoId;
}
