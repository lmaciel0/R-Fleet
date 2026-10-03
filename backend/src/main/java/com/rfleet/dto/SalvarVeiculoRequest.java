package com.rfleet.dto;

import com.rfleet.validation.ValidPlaca;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SalvarVeiculoRequest {

    @NotBlank(message = "A placa é obrigatória")
    @ValidPlaca
    private String placa;

    @NotBlank(message = "O modelo do veículo é obrigatório")
    @Size(max = 100, message = "O modelo não pode ultrapassar 100 caracteres")
    private String modelo;

    private Long origemId;
}
