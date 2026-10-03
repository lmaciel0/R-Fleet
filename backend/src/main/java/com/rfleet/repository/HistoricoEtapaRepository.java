package com.rfleet.repository;

import com.rfleet.domain.HistoricoEtapa;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface HistoricoEtapaRepository extends JpaRepository<HistoricoEtapa, Long> {

    @Query("SELECT h FROM HistoricoEtapa h " +
           "LEFT JOIN FETCH h.usuario " +
           "WHERE h.ordemServico.id = :ordemServicoId " +
           "ORDER BY h.dataHora DESC")
    List<HistoricoEtapa> findByOrdemServicoIdOrderByDataHoraDesc(@Param("ordemServicoId") Long ordemServicoId);

    @Query("SELECT h FROM HistoricoEtapa h " +
           "LEFT JOIN FETCH h.usuario " +
           "WHERE h.ordemServico.id = :ordemServicoId " +
           "ORDER BY h.dataHora ASC")
    List<HistoricoEtapa> findByOrdemServicoIdOrderByDataHoraAsc(@Param("ordemServicoId") Long ordemServicoId);
}
