package com.rfleet.dto;

import com.rfleet.domain.EtapaOrdemServico;
import com.rfleet.validation.ValidPlaca;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RegistrarEntradaRequest {

    @NotBlank(message = "A placa do veículo é obrigatória")
    @ValidPlaca
    private String placa;

    @NotBlank(message = "O modelo do veículo é obrigatório")
    @Size(max = 100, message = "O modelo não pode ultrapassar 100 caracteres")
    private String modelo;

    private Long origemId;

    private Long tipoServicoId;

    @Builder.Default
    private EtapaOrdemServico etapa = EtapaOrdemServico.AGUARDANDO_ORCAMENTO;

    @PositiveOrZero(message = "O valor do orçamento deve ser zero ou positivo")
    @Builder.Default
    private BigDecimal valorOrcamento = BigDecimal.ZERO;

    private LocalDate dataEntrada;

    private String observacoes;
}
