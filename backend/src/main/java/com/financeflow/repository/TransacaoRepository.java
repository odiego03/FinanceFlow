package com.financeflow.repository;

import com.financeflow.model.Transacao;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface TransacaoRepository extends JpaRepository<Transacao, Long> {

    LocalDate SEM_INICIO = LocalDate.of(1900, 1, 1);
    LocalDate SEM_FIM = LocalDate.of(9999, 12, 31);

    // Sem o EntityGraph o Hibernate faria um SELECT extra por categoria — cada um paga a latência do Neon
    @EntityGraph(attributePaths = {"usuario", "categoria", "categoria.usuario", "parcelamento"})
    List<Transacao> findByUsuarioId(Long usuarioId);

    @EntityGraph(attributePaths = {"usuario", "categoria", "categoria.usuario", "parcelamento"})
    List<Transacao> findByUsuarioIdAndDataBetween(Long usuarioId, LocalDate inicio, LocalDate fim);

    // null = sem limite daquele lado
    default List<Transacao> buscarDoPeriodo(Long usuarioId, LocalDate inicio, LocalDate fim) {
        return findByUsuarioIdAndDataBetween(usuarioId, inicio != null ? inicio : SEM_INICIO, fim != null ? fim : SEM_FIM);
    }

    List<Transacao> findByParcelamentoId(Long parcelamentoId);

    Optional<Transacao> findByIdAndUsuarioId(Long id, Long usuarioId);

    // Trava a linha até o fim da transação: duas contribuições ao mesmo tempo não passam juntas do saldo dela
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT t FROM Transacao t WHERE t.id = :id AND t.usuario.id = :usuarioId")
    Optional<Transacao> buscarParaAtualizar(@Param("id") Long id, @Param("usuarioId") Long usuarioId);

    long countByCategoriaId(Long categoriaId);

    // Só os campos usados na detecção de duplicata da importação: [data, valor, descricao, identificadorExterno]
    @Query("SELECT t.data, t.valor, t.descricao, t.identificadorExterno FROM Transacao t "
            + "WHERE t.usuario.id = :usuarioId AND t.data BETWEEN :inicio AND :fim")
    List<Object[]> buscarResumoParaDuplicata(@Param("usuarioId") Long usuarioId, @Param("inicio") LocalDate inicio,
                                             @Param("fim") LocalDate fim);
}
