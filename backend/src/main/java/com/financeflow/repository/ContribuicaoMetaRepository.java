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

    @Query("SELECT COALESCE(SUM(c.valor), 0) FROM ContribuicaoMeta c WHERE c.transacao.id = :transacaoId")
    BigDecimal somarPorTransacao(@Param("transacaoId") Long transacaoId);
}
