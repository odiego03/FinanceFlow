package com.financeflow.repository;

import com.financeflow.model.Transacao;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface TransacaoRepository extends JpaRepository<Transacao, Long> {

    // Sem o EntityGraph o Hibernate faria um SELECT extra por categoria — cada um paga a latência do Neon
    @EntityGraph(attributePaths = {"usuario", "categoria", "categoria.usuario", "parcelamento"})
    List<Transacao> findByUsuarioId(Long usuarioId);

    List<Transacao> findByParcelamentoId(Long parcelamentoId);

    Optional<Transacao> findByIdAndUsuarioId(Long id, Long usuarioId);

    long countByCategoriaId(Long categoriaId);

    // Só os campos usados na detecção de duplicata da importação: [data, valor, descricao, identificadorExterno]
    @Query("SELECT t.data, t.valor, t.descricao, t.identificadorExterno FROM Transacao t "
            + "WHERE t.usuario.id = :usuarioId AND t.data BETWEEN :inicio AND :fim")
    List<Object[]> buscarResumoParaDuplicata(@Param("usuarioId") Long usuarioId, @Param("inicio") LocalDate inicio,
                                             @Param("fim") LocalDate fim);
}
