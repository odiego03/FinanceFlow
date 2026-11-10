package com.financeflow.repository;

import com.financeflow.model.CodigoRedefinicaoSenha;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CodigoRedefinicaoSenhaRepository extends JpaRepository<CodigoRedefinicaoSenha, Long> {

    // Só o mais recente vale: pedir um código novo invalida os anteriores (são apagados)
    Optional<CodigoRedefinicaoSenha> findFirstByUsuarioIdOrderByCriadoEmDesc(Long usuarioId);

    void deleteByUsuarioId(Long usuarioId);
}
