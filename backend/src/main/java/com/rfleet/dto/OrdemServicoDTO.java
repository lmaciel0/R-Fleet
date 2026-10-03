package com.rfleet.dto;

import com.rfleet.domain.EtapaOrdemServico;
import com.rfleet.domain.OrdemServico;
import com.rfleet.domain.Veiculo;
import com.rfleet.util.PlacaUtils;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZonedDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrdemServicoDTO {

    private Long id;

    // Dados do Veículo
    private Long veiculoId;
    private String placa;
    private String placaFormatada;
    private String modelo;
    private boolean mercosul;
    private Long origemId;
    private String origemNome;

    // Dados do Serviço
    private Long tipoServicoId;
    private String tipoServicoNome;

    // Etapa e Ciclo de Vida
    private EtapaOrdemServico etapa;
    private String etapaDescricao;
    private boolean servicoConcluido;

    // Financeiro
    private BigDecimal valorOrcamento;
    private Boolean faturado;
    private LocalDate dataFaturamento;
    private String numeroNf;

    // Prazos e SLA
    private LocalDate dataEntrada;
    private LocalDate dataSaida;
    private long diasNoPatio;
    private String statusSla; // VERDE, AMARELO, VERMELHO

    private String observacoes;
    private Boolean ativo;
    private ZonedDateTime criadoEm;
    private ZonedDateTime atualizadoEm;

    public static OrdemServicoDTO fromEntity(OrdemServico os, long limiteDias, LocalDate dataReferencia) {
        if (os == null) {
            return null;
        }

        Veiculo veiculo = os.getVeiculo();
        String placa = veiculo != null ? veiculo.getPlaca() : "";

        return OrdemServicoDTO.builder()
                .id(os.getId())
                .veiculoId(veiculo != null ? veiculo.getId() : null)
                .placa(placa)
                .placaFormatada(PlacaUtils.formatar(placa))
                .modelo(veiculo != null ? veiculo.getModelo() : "")
                .mercosul(PlacaUtils.isMercosul(placa))
                .origemId(veiculo != null && veiculo.getOrigemPadrao() != null ? veiculo.getOrigemPadrao().getId() : null)
                .origemNome(veiculo != null && veiculo.getOrigemPadrao() != null ? veiculo.getOrigemPadrao().getNome() : null)
                .tipoServicoId(os.getTipoServico() != null ? os.getTipoServico().getId() : null)
                .tipoServicoNome(os.getTipoServico() != null ? os.getTipoServico().getNome() : null)
                .etapa(os.getEtapa())
                .etapaDescricao(os.getEtapa() != null ? os.getEtapa().getDescricao() : "")
                .servicoConcluido(os.isServicoConcluido())
                .valorOrcamento(os.getValorOrcamento())
                .faturado(os.getFaturado())
                .dataFaturamento(os.getDataFaturamento())
                .numeroNf(os.getNumeroNf())
                .dataEntrada(os.getDataEntrada())
                .dataSaida(os.getDataSaida())
                .diasNoPatio(os.calcularDiasNoPatio(dataReferencia))
                .statusSla(os.calcularStatusSla(limiteDias, dataReferencia))
                .observacoes(os.getObservacoes())
                .ativo(os.getAtivo())
                .criadoEm(os.getCriadoEm())
                .atualizadoEm(os.getAtualizadoEm())
                .build();
    }
}
