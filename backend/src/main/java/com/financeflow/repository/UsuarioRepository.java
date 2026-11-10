package com.financeflow.repository;

import com.financeflow.exception.UsuarioNaoAutenticadoException;
import com.financeflow.model.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {

    Optional<Usuario> findByEmail(String email);

    // Lista porque contas antigas, criadas antes do email ser guardado em minúsculas, podem diferir só na caixa
    List<Usuario> findAllByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);

    // O subject do token é o email exatamente como está gravado
    default Usuario buscarDoToken(String email) {
        return findByEmail(email).orElseThrow(UsuarioNaoAutenticadoException::new);
    }
}
