package com.rfleet.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;

@Entity
@Table(name = "ordens_servico")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(of = "id")
public class OrdemServico {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "veiculo_id", nullable = false)
    private Veiculo veiculo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tipo_servico_id")
    private TipoServico tipoServico;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private EtapaOrdemServico etapa = EtapaOrdemServico.AGUARDANDO_ORCAMENTO;

    @Column(name = "valor_orcamento", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal valorOrcamento = BigDecimal.ZERO;

    @Column(nullable = false)
    @Builder.Default
    private Boolean faturado = false;

    @Column(name = "data_faturamento")
    private LocalDate dataFaturamento;

    @Column(name = "numero_nf", length = 50)
    private String numeroNf;

    @Column(name = "data_entrada", nullable = false)
    private LocalDate dataEntrada;

    @Column(name = "data_saida")
    private LocalDate dataSaida;

    @Column(columnDefinition = "TEXT")
    private String observacoes;

    @Column(nullable = false)
    @Builder.Default
    private Boolean ativo = true;

    @CreationTimestamp
    @Column(name = "criado_em", nullable = false, updatable = false)
    private ZonedDateTime criadoEm;

    @UpdateTimestamp
    @Column(name = "atualizado_em", nullable = false)
    private ZonedDateTime atualizadoEm;

    /**
     * Regra de negócio: 'Serviço Concluído' é derivado da etapa.
     */
    public boolean isServicoConcluido() {
        return this.etapa != null && this.etapa.isConcluido();
    }

    /**
     * Calcula a quantidade de dias que o carro passou ou está no pátio.
     */
    public long calcularDiasNoPatio(LocalDate dataReferencia) {
        if (this.dataEntrada == null) {
            return 0;
        }
        LocalDate dataFinal = this.dataSaida != null ? this.dataSaida : (dataReferencia != null ? dataReferencia : LocalDate.now());
        long dias = ChronoUnit.DAYS.between(this.dataEntrada, dataFinal);
        return Math.max(0, dias);
    }

    /**
     * Determina a cor do semáforo:
     * - VERDE: Concluído (Finalizado, Aguardando Retirada, Entregue)
     * - VERMELHO: Em aberto e estourou limite SLA (> 15 dias)
     * - AMARELO: Em aberto dentro do prazo
     */
    public String calcularStatusSla(long limiteDias, LocalDate dataReferencia) {
        if (isServicoConcluido()) {
            return "VERDE";
        }
        long dias = calcularDiasNoPatio(dataReferencia);
        if (dias > limiteDias) {
            return "VERMELHO";
        }
        return "AMARELO";
    }
}
