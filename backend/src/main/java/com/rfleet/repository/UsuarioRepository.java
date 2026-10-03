package com.rfleet.repository;

import com.rfleet.domain.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UsuarioRepository extends JpaRepository<Usuario, UUID> {

    Optional<Usuario> findByEmailIgnoreCase(String email);

    default Optional<Usuario> findByEmail(String email) {
        return findByEmailIgnoreCase(email);
    }

    boolean existsByEmailIgnoreCase(String email);
}
