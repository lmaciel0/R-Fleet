package com.rfleet.repository;

import com.rfleet.domain.EtapaOrdemServico;
import com.rfleet.domain.OrdemServico;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface OrdemServicoRepository extends JpaRepository<OrdemServico, Long>, JpaSpecificationExecutor<OrdemServico> {

    @Query("SELECT os FROM OrdemServico os " +
           "JOIN FETCH os.veiculo v " +
           "LEFT JOIN FETCH v.origemPadrao " +
           "LEFT JOIN FETCH os.tipoServico " +
           "WHERE os.id = :id")
    Optional<OrdemServico> findByIdComDetalhes(@Param("id") Long id);

    /**
     * Busca a OS em aberto do veículo (etapa <> ENTREGUE e ativo = true)
     */
    Optional<OrdemServico> findByVeiculoIdAndEtapaNotAndAtivoTrue(Long veiculoId, EtapaOrdemServico etapa);

    List<OrdemServico> findByVeiculoIdOrderByDataEntradaDesc(Long veiculoId);

    List<OrdemServico> findByEtapaAndAtivoTrue(EtapaOrdemServico etapa);
}
