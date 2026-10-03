package com.rfleet.repository;

import com.rfleet.domain.Veiculo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface VeiculoRepository extends JpaRepository<Veiculo, Long> {

    @Query("SELECT v FROM Veiculo v LEFT JOIN FETCH v.origemPadrao WHERE v.placa = :placa")
    Optional<Veiculo> findByPlacaComOrigem(@Param("placa") String placa);

    Optional<Veiculo> findByPlaca(String placa);

    boolean existsByPlaca(String placa);

    @Query("SELECT v FROM Veiculo v LEFT JOIN FETCH v.origemPadrao " +
           "WHERE (:termo IS NULL OR LOWER(v.placa) LIKE LOWER(CONCAT('%', :termo, '%')) " +
           "OR LOWER(v.modelo) LIKE LOWER(CONCAT('%', :termo, '%'))) " +
           "ORDER BY v.placa ASC")
    List<Veiculo> buscarPorTermo(@Param("termo") String termo);

    /**
     * Retorna a OS ativa caso exista (id, etapa)
     */
    @Query(value = "SELECT id, etapa FROM ordens_servico WHERE veiculo_id = :veiculoId AND etapa <> 'ENTREGUE' AND ativo = true LIMIT 1", nativeQuery = true)
    List<Object[]> findOsAtivaByVeiculoId(@Param("veiculoId") Long veiculoId);
}
