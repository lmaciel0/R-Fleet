package com.rfleet.repository;

import com.rfleet.domain.Origem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface OrigemRepository extends JpaRepository<Origem, Long> {

    List<Origem> findAllByOrderByNomeAsc();

    List<Origem> findByAtivoTrueOrderByNomeAsc();

    Optional<Origem> findByNomeIgnoreCase(String nome);

    boolean existsByNomeIgnoreCase(String nome);
}
