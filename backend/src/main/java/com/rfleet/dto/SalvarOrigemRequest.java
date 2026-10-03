package com.rfleet.dto;

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
public class SalvarOrigemRequest {

    @NotBlank(message = "O nome da origem é obrigatório")
    @Size(max = 100, message = "O nome não pode ultrapassar 100 caracteres")
    private String nome;

    @Builder.Default
    private Boolean ativo = true;
}
