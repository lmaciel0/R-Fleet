package com.rfleet.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.*;

@Entity
@Table(name = "configuracoes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(of = "chave")
public class Configuracao {

    @Id
    @Column(length = 100)
    private String chave;

    @Column(nullable = false, length = 255)
    private String valor;

    @Column(length = 255)
    private String descricao;
}
