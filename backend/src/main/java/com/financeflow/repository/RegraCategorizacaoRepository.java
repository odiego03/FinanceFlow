package com.financeflow.repository;

import com.financeflow.model.RegraCategorizacao;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface RegraCategorizacaoRepository extends JpaRepository<RegraCategorizacao, Long> {

    List<RegraCategorizacao> findByUsuarioIdAndDescricaoNormalizadaIn(Long usuarioId, Collection<String> descricoesNormalizadas);

    Optional<RegraCategorizacao> findByUsuarioIdAndDescricaoNormalizada(Long usuarioId, String descricaoNormalizada);

    void deleteByCategoriaId(Long categoriaId);
}
