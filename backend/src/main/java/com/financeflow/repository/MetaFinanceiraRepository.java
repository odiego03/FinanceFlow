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

    @EntityGraph(attributePaths = {"usuario", "categorias", "categorias.usuario"})
    List<MetaFinanceira> findByUsuarioId(Long usuarioId);

    @EntityGraph(attributePaths = {"usuario", "categorias", "categorias.usuario"})
    Optional<MetaFinanceira> findByIdAndUsuarioId(Long id, Long usuarioId);

    // Trava a meta até o fim da transação: duas contribuições ao mesmo tempo não passam juntas do valor alvo
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT m FROM MetaFinanceira m WHERE m.id = :id AND m.usuario.id = :usuarioId")
    Optional<MetaFinanceira> buscarParaAtualizar(@Param("id") Long id, @Param("usuarioId") Long usuarioId);

    @Query("SELECT COUNT(m) FROM MetaFinanceira m JOIN m.categorias c WHERE c.id = :categoriaId")
    long countByCategoriaId(@Param("categoriaId") Long categoriaId);
}
