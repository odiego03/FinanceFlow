package com.financeflow.repository;

import com.financeflow.model.TokenVerificacaoEmail;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TokenVerificacaoEmailRepository extends JpaRepository<TokenVerificacaoEmail, Long> {

    Optional<TokenVerificacaoEmail> findByTokenHash(String tokenHash);

    // Só o mais recente vale: pedir outro e-mail de confirmação invalida os links anteriores (são apagados)
    Optional<TokenVerificacaoEmail> findFirstByUsuarioIdOrderByCriadoEmDesc(Long usuarioId);

    void deleteByUsuarioId(Long usuarioId);
}
