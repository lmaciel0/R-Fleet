package com.rfleet.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.ZonedDateTime;

@Entity
@Table(name = "anexos_os")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AnexoOs {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ordem_servico_id", nullable = false)
    private OrdemServico ordemServico;

    @Column(name = "nome_arquivo", nullable = false, length = 255)
    private String nomeArquivo;

    @Column(name = "tipo_conteudo", nullable = false, length = 100)
    private String tipoConteudo;

    @Column(name = "tamanho_bytes", nullable = false)
    private Long tamanhoBytes;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id")
    private Usuario usuario;

    @CreationTimestamp
    @Column(name = "criado_em", nullable = false, updatable = false)
    private ZonedDateTime criadoEm;
}
