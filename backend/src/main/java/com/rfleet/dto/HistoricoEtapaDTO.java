package com.rfleet.dto;

import com.rfleet.domain.EtapaOrdemServico;
import com.rfleet.domain.HistoricoEtapa;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.ZonedDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HistoricoEtapaDTO {

    private Long id;
    private Long ordemServicoId;

    private EtapaOrdemServico etapaAnterior;
    private String etapaAnteriorDescricao;

    private EtapaOrdemServico etapaNova;
    private String etapaNovaDescricao;

    private String usuarioNome;
    private String usuarioEmail;

    private BigDecimal valorOrcamentoMomento;
    private String observacao;
    private ZonedDateTime dataHora;

    public static HistoricoEtapaDTO fromEntity(HistoricoEtapa h) {
        if (h == null) {
            return null;
        }

        return HistoricoEtapaDTO.builder()
                .id(h.getId())
                .ordemServicoId(h.getOrdemServico() != null ? h.getOrdemServico().getId() : null)
                .etapaAnterior(h.getEtapaAnterior())
                .etapaAnteriorDescricao(h.getEtapaAnterior() != null ? h.getEtapaAnterior().getDescricao() : "Entrada Inicial")
                .etapaNova(h.getEtapaNova())
                .etapaNovaDescricao(h.getEtapaNova() != null ? h.getEtapaNova().getDescricao() : "")
                .usuarioNome(h.getUsuario() != null ? h.getUsuario().getNome() : "Sistema")
                .usuarioEmail(h.getUsuario() != null ? h.getUsuario().getEmail() : null)
                .valorOrcamentoMomento(h.getValorOrcamentoMomento())
                .observacao(h.getObservacao())
                .dataHora(h.getDataHora())
                .build();
    }
}
