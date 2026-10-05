package com.rfleet.repository;

import com.rfleet.domain.EtapaOrdemServico;
import com.rfleet.domain.OrdemServico;
import com.rfleet.dto.FaturamentoAgregado;
import com.rfleet.dto.HistoricoMesDTO;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
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

    List<OrdemServico> findByAtivoTrue();

    boolean existsByVeiculoIdAndEtapaNotAndAtivoTrue(Long veiculoId, EtapaOrdemServico etapa);

    @Query("SELECT new com.rfleet.dto.HistoricoMesDTO(" +
           "  YEAR(os.dataSaida), MONTH(os.dataSaida), COUNT(os), SUM(os.valorOrcamento)) " +
           "FROM OrdemServico os " +
           "WHERE os.etapa = :etapa AND os.ativo = true AND os.dataSaida IS NOT NULL " +
           "GROUP BY YEAR(os.dataSaida), MONTH(os.dataSaida) " +
           "ORDER BY YEAR(os.dataSaida) DESC, MONTH(os.dataSaida) DESC")
    List<HistoricoMesDTO> resumirPorMesDeSaida(@Param("etapa") EtapaOrdemServico etapa);

    @Query("SELECT new com.rfleet.dto.FaturamentoAgregado(SUM(os.valorOrcamento), COUNT(os)) " +
           "FROM OrdemServico os " +
           "WHERE os.ativo = true AND os.faturado = true " +
           "AND os.dataFaturamento >= :inicio AND os.dataFaturamento <= :fim")
    FaturamentoAgregado somarFaturadoEntre(@Param("inicio") LocalDate inicio, @Param("fim") LocalDate fim);

    @Query("SELECT new com.rfleet.dto.FaturamentoAgregado(SUM(os.valorOrcamento), COUNT(os)) " +
           "FROM OrdemServico os WHERE os.ativo = true AND os.faturado = true")
    FaturamentoAgregado somarFaturadoGeral();
}
