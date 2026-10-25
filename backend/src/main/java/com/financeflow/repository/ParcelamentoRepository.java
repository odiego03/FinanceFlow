package com.financeflow.repository;

import com.financeflow.model.Parcelamento;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ParcelamentoRepository extends JpaRepository<Parcelamento, Long> {

    List<Parcelamento> findByUsuarioIdOrderByDataPrimeiraParcelaDesc(Long usuarioId);

    Optional<Parcelamento> findByIdAndUsuarioId(Long id, Long usuarioId);
}
