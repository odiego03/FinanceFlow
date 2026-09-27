package com.financeflow.repository;

import com.financeflow.model.Aporte;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface AporteRepository extends JpaRepository<Aporte, Long> {

    List<Aporte> findByMetaId(Long metaId);

    Optional<Aporte> findByIdAndMetaId(Long id, Long metaId);

    @Query("SELECT COALESCE(SUM(a.valor), 0) FROM Aporte a WHERE a.meta.id = :metaId")
    BigDecimal somarPorMeta(@Param("metaId") Long metaId);
}
