package com.rfleet.repository;

import com.rfleet.domain.EtapaOrdemServico;
import com.rfleet.domain.OrdemServico;
import com.rfleet.domain.Veiculo;
import com.rfleet.dto.FiltroOrdensServico;
import jakarta.persistence.criteria.*;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

public class OrdemServicoSpecification {

    public static Specification<OrdemServico> comFiltros(FiltroOrdensServico filtro, long limiteDiasSla) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Garante fetch dos relacionamentos quando não for query de contagem
            if (query != null && Long.class != query.getResultType() && long.class != query.getResultType()) {
                root.fetch("veiculo", JoinType.LEFT).fetch("origemPadrao", JoinType.LEFT);
                root.fetch("tipoServico", JoinType.LEFT);
            }

            Join<OrdemServico, Veiculo> veiculoJoin = root.join("veiculo", JoinType.LEFT);

            // 1. Ativo / Soft delete
            if (filtro.ativo() != null) {
                predicates.add(cb.equal(root.get("ativo"), filtro.ativo()));
            } else {
                predicates.add(cb.equal(root.get("ativo"), true));
            }

            // 2. Termo de busca (Placa ou Modelo)
            if (filtro.termo() != null && !filtro.termo().trim().isEmpty()) {
                String termoNormalizado = "%" + filtro.termo().trim().toLowerCase() + "%";
                Predicate placaLike = cb.like(cb.lower(veiculoJoin.get("placa")), termoNormalizado);
                Predicate modeloLike = cb.like(cb.lower(veiculoJoin.get("modelo")), termoNormalizado);
                predicates.add(cb.or(placaLike, modeloLike));
            }

            // 3. Etapas
            if (filtro.etapas() != null && !filtro.etapas().isEmpty()) {
                predicates.add(root.get("etapa").in(filtro.etapas()));
            }

            // 4. Origem do Veículo
            if (filtro.origemId() != null) {
                predicates.add(cb.equal(veiculoJoin.get("origemPadrao").get("id"), filtro.origemId()));
            }

            // 5. Tipo de Serviço
            if (filtro.tipoServicoId() != null) {
                predicates.add(cb.equal(root.get("tipoServico").get("id"), filtro.tipoServicoId()));
            }

            // 6. Faturado
            if (filtro.faturado() != null) {
                predicates.add(cb.equal(root.get("faturado"), filtro.faturado()));
            }

            // 7. Concluído (Derivado da etapa)
            if (filtro.concluido() != null) {
                List<EtapaOrdemServico> etapasConcluidas = List.of(
                        EtapaOrdemServico.FINALIZADO,
                        EtapaOrdemServico.AGUARDANDO_RETIRADA,
                        EtapaOrdemServico.ENTREGUE
                );
                if (filtro.concluido()) {
                    predicates.add(root.get("etapa").in(etapasConcluidas));
                } else {
                    predicates.add(cb.not(root.get("etapa").in(etapasConcluidas)));
                }
            }

            // 8. Período de Entrada
            if (filtro.dataEntradaInicio() != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("dataEntrada"), filtro.dataEntradaInicio()));
            }
            if (filtro.dataEntradaFim() != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("dataEntrada"), filtro.dataEntradaFim()));
            }

            // 9. Em Atraso / Alerta SLA
            if (Boolean.TRUE.equals(filtro.emAtraso())) {
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
