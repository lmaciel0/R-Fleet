package com.rfleet.repository;

import com.rfleet.domain.AnexoOs;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AnexoOsRepository extends JpaRepository<AnexoOs, Long> {

    List<AnexoOs> findByOrdemServicoIdOrderByCriadoEmDesc(Long ordemServicoId);

    long countByOrdemServicoId(Long ordemServicoId);
}
