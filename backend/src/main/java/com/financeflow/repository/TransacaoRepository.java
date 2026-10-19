package com.financeflow.repository;

import com.financeflow.model.Transacao;
import org.springframework.data.jpa.repository.JpaRepository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface TransacaoRepository extends JpaRepository<Transacao, Long> {

    List<Transacao> findByUsuarioId(Long usuarioId);

    Optional<Transacao> findByIdAndUsuarioId(Long id, Long usuarioId);

    boolean existsByUsuarioIdAndDataAndValorAndDescricao(Long usuarioId, LocalDate data, BigDecimal valor, String descricao);
}
