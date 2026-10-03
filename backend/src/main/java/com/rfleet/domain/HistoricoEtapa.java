package com.rfleet.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.ZonedDateTime;

@Entity
@Table(name = "historico_etapas")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(of = "id")
public class HistoricoEtapa {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ordem_servico_id", nullable = false)
    private OrdemServico ordemServico;

    @Enumerated(EnumType.STRING)
    @Column(name = "etapa_anterior", length = 30)
    private EtapaOrdemServico etapaAnterior;

    @Enumerated(EnumType.STRING)
    @Column(name = "etapa_nova", nullable = false, length = 30)
    private EtapaOrdemServico etapaNova;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id")
    private Usuario usuario;

    @Column(name = "valor_orcamento_momento", precision = 12, scale = 2)
    private BigDecimal valorOrcamentoMomento;

    @Column(columnDefinition = "TEXT")
    private String observacao;

    @CreationTimestamp
    @Column(name = "data_hora", nullable = false, updatable = false)
    private ZonedDateTime dataHora;
}
