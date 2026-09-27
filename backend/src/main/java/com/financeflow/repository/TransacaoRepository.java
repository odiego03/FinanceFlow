package com.financeflow.repository;

import com.financeflow.model.Transacao;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface TransacaoRepository extends JpaRepository<Transacao, Long> {

    List<Transacao> findByUsuarioId(Long usuarioId);

    Optional<Transacao> findByIdAndUsuarioId(Long id, Long usuarioId);

    @Query("SELECT COALESCE(SUM(t.valor), 0) FROM Transacao t "
            + "WHERE t.categoria.id = :categoriaId AND t.tipo = com.financeflow.model.TipoMovimentacao.RECEITA")
    BigDecimal somarReceitasPorCategoria(@Param("categoriaId") Long categoriaId);
}
