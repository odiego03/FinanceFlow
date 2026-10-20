package com.financeflow.repository;

import com.financeflow.model.ContribuicaoMeta;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;

public interface ContribuicaoMetaRepository extends JpaRepository<ContribuicaoMeta, Long> {

    List<ContribuicaoMeta> findByMetaId(Long metaId);

    List<ContribuicaoMeta> findByTransacaoId(Long transacaoId);

    @Query("SELECT COALESCE(SUM(c.valor), 0) FROM ContribuicaoMeta c WHERE c.meta.id = :metaId")
    BigDecimal somarPorMeta(@Param("metaId") Long metaId);

    // Cada linha: [transacaoId (Long), total (BigDecimal)] — só transações com alguma contribuição
    @Query("SELECT c.transacao.id, SUM(c.valor) FROM ContribuicaoMeta c WHERE c.transacao.usuario.id = :usuarioId GROUP BY c.transacao.id")
    List<Object[]> somarPorTransacaoDoUsuario(@Param("usuarioId") Long usuarioId);

    @Query("SELECT COALESCE(SUM(c.valor), 0) FROM ContribuicaoMeta c WHERE c.transacao.id = :transacaoId")
    BigDecimal somarPorTransacao(@Param("transacaoId") Long transacaoId);
}
