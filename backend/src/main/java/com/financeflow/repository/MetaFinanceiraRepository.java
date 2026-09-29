package com.financeflow.repository;

import com.financeflow.model.MetaFinanceira;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MetaFinanceiraRepository extends JpaRepository<MetaFinanceira, Long> {

    List<MetaFinanceira> findByUsuarioId(Long usuarioId);

    Optional<MetaFinanceira> findByIdAndUsuarioId(Long id, Long usuarioId);
}
