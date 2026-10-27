package com.financeflow.repository;

import com.financeflow.model.MetaFinanceira;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface MetaFinanceiraRepository extends JpaRepository<MetaFinanceira, Long> {

    @EntityGraph(attributePaths = {"usuario", "categoria", "categoria.usuario"})
    List<MetaFinanceira> findByUsuarioId(Long usuarioId);

    Optional<MetaFinanceira> findByIdAndUsuarioId(Long id, Long usuarioId);

    // Trava a meta até o fim da transação: duas contribuições ao mesmo tempo não passam juntas do valor alvo
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT m FROM MetaFinanceira m WHERE m.id = :id AND m.usuario.id = :usuarioId")
    Optional<MetaFinanceira> buscarParaAtualizar(@Param("id") Long id, @Param("usuarioId") Long usuarioId);

    long countByCategoriaId(Long categoriaId);
}
