package com.rfleet.repository;

import com.rfleet.domain.EtapaOrdemServico;
import com.rfleet.domain.OrdemServico;
import com.rfleet.domain.Veiculo;
import jakarta.persistence.criteria.*;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

public class OrdemServicoSpecification {

    public static Specification<OrdemServico> comFiltros(
            String termo,
            List<EtapaOrdemServico> etapas,
            Long origemId,
            Long tipoServicoId,
            Boolean faturado,
            Boolean concluido,
            LocalDate dataEntradaInicio,
            LocalDate dataEntradaFim,
            Boolean emAtraso,
            long limiteDiasSla,
            Boolean ativo
    ) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Garante fetch dos relacionamentos quando não for query de contagem
            if (query != null && Long.class != query.getResultType() && long.class != query.getResultType()) {
                root.fetch("veiculo", JoinType.LEFT).fetch("origemPadrao", JoinType.LEFT);
                root.fetch("tipoServico", JoinType.LEFT);
            }

            Join<OrdemServico, Veiculo> veiculoJoin = root.join("veiculo", JoinType.LEFT);

            // 1. Ativo / Soft delete
            if (ativo != null) {
                predicates.add(cb.equal(root.get("ativo"), ativo));
            } else {
                predicates.add(cb.equal(root.get("ativo"), true));
            }

            // 2. Termo de busca (Placa ou Modelo)
            if (termo != null && !termo.trim().isEmpty()) {
                String termoNormalizado = "%" + termo.trim().toLowerCase() + "%";
                Predicate placaLike = cb.like(cb.lower(veiculoJoin.get("placa")), termoNormalizado);
                Predicate modeloLike = cb.like(cb.lower(veiculoJoin.get("modelo")), termoNormalizado);
                predicates.add(cb.or(placaLike, modeloLike));
            }

            // 3. Etapas
            if (etapas != null && !etapas.isEmpty()) {
                predicates.add(root.get("etapa").in(etapas));
            }

            // 4. Origem do Veículo
            if (origemId != null) {
                predicates.add(cb.equal(veiculoJoin.get("origemPadrao").get("id"), origemId));
            }

            // 5. Tipo de Serviço
            if (tipoServicoId != null) {
                predicates.add(cb.equal(root.get("tipoServico").get("id"), tipoServicoId));
            }

            // 6. Faturado
            if (faturado != null) {
                predicates.add(cb.equal(root.get("faturado"), faturado));
            }

            // 7. Concluído (Derivado da etapa)
            if (concluido != null) {
                List<EtapaOrdemServico> etapasConcluidas = List.of(
                        EtapaOrdemServico.FINALIZADO,
                        EtapaOrdemServico.AGUARDANDO_RETIRADA,
                        EtapaOrdemServico.ENTREGUE
                );
                if (concluido) {
                    predicates.add(root.get("etapa").in(etapasConcluidas));
                } else {
                    predicates.add(cb.not(root.get("etapa").in(etapasConcluidas)));
                }
            }

            // 8. Período de Entrada
            if (dataEntradaInicio != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("dataEntrada"), dataEntradaInicio));
            }
            if (dataEntradaFim != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("dataEntrada"), dataEntradaFim));
            }

            // 9. Em Atraso / Alerta SLA
            if (Boolean.TRUE.equals(emAtraso)) {
                LocalDate dataLimite = LocalDate.now().minusDays(limiteDiasSla);
                List<EtapaOrdemServico> etapasConcluidas = List.of(
                        EtapaOrdemServico.FINALIZADO,
                        EtapaOrdemServico.AGUARDANDO_RETIRADA,
                        EtapaOrdemServico.ENTREGUE
                );
                Predicate naoConcluido = cb.not(root.get("etapa").in(etapasConcluidas));
                Predicate dataUltrapassada = cb.lessThan(root.get("dataEntrada"), dataLimite);
                predicates.add(cb.and(naoConcluido, dataUltrapassada));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
