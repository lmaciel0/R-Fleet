package com.rfleet.repository;

import com.rfleet.domain.TipoServico;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TipoServicoRepository extends JpaRepository<TipoServico, Long> {

    List<TipoServico> findAllByOrderByNomeAsc();

    List<TipoServico> findByAtivoTrueOrderByNomeAsc();

    Optional<TipoServico> findByNomeIgnoreCase(String nome);

    boolean existsByNomeIgnoreCase(String nome);
}
