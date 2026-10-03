package com.rfleet.domain;

import lombok.Getter;

@Getter
public enum EtapaOrdemServico {

    AGUARDANDO_ORCAMENTO("Aguardando Orçamento", 1),
    ORCAMENTO("Orçamento", 2),
    APROVADO("Aprovado", 3),
    EM_SERVICO("Em Serviço", 4),
    FINALIZADO("Finalizado", 5),
    AGUARDANDO_RETIRADA("Aguardando Retirada", 6),
    ENTREGUE("Entregue", 7);

    private final String descricao;
    private final int ordemFluxo;

    EtapaOrdemServico(String descricao, int ordemFluxo) {
        this.descricao = descricao;
        this.ordemFluxo = ordemFluxo;
    }

    /**
     * Regra do Negócio: O serviço é considerado concluído a partir de 'Finalizado'.
     */
    public boolean isConcluido() {
        return this == FINALIZADO || this == AGUARDANDO_RETIRADA || this == ENTREGUE;
    }
}
