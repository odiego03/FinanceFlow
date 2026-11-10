package com.financeflow.repository;

import com.financeflow.model.PreferenciasUsuario;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PreferenciasUsuarioRepository extends JpaRepository<PreferenciasUsuario, Long> {

    Optional<PreferenciasUsuario> findByUsuarioId(Long usuarioId);
}
